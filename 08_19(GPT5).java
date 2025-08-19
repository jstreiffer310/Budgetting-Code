/**
 * FINANCE AUTOMATION — FULL REWRITE (v2)
 * --------------------------------------
 * Goals addressed:
 *  - Robust email parsing (PC Financial, Interac, Wealthsimple, CIBC purchases + CIBC payments)
 *  - Reliable internal/external transfer pairing via a staging queue with time/amount matching
 *  - Dynamic Accounts balance updates (incl. credit cards) driven by parsed emails & CSVs
 *  - Better duplicate protection (by email id + transaction fingerprint)
 *  - Category learning that actually applies & persists, plus keyword suggestions
 *  - Dashboard charts that don’t revert and support both SUM($) and COUNT(by Category)
 *  - Safer column indexing: explicit schema constants instead of magic numbers
 *  - Net worth log maintained automatically
 *
 * IMPORTANT:
 *  - This script assumes your sheet schemas match the constants below.
 *  - Search label used in Gmail is 'Transfers' (customizable).
 *  - CIBC emails vary; multiple regex fallbacks provided for both purchases and payments.
 */

// ========================================
// ============ CONFIG & SCHEMA ============
// ========================================

const SPREADSHEET_ID = '1-eUeYMTeKoz2bIkHS8Jc2J9vO0Bnl8y6aHXmXGdJqg8';

const SHEETS = {
  MAIN: 'Transactions',
  STAGING: 'Staging',
  ACCOUNTS: 'Accounts',
  CATEGORIES: 'Categories',
  NETWORTH: 'NetWorthHistory',
  DASHBOARD: 'Dashboard',
  CSV_IMPORT: 'CSV_Import',
  HOLDINGS: 'Holdings'
};

// Column schema for Transactions sheet (A:I)
const TX_COL = { DATE: 1, AMOUNT: 2, FROM: 3, TO: 4, BANK: 5, NOTES: 6, ID: 7, CATEGORY: 8, TYPE: 9 };

// Column schema for Accounts sheet: [Name, Balance, Last Updated]
const ACC_COL = { NAME: 1, BAL: 2, UPDATED: 3 };

// Column schema for Staging sheet: keep flexible metadata for pairing
// [Date, Amount, FromAcct, ToAcct, Source/Bank, EmailId, StagedAt, Direction, Notes]
const STG_COL = { DATE: 1, AMOUNT: 2, FROM: 3, TO: 4, BANK: 5, ID: 6, STAGED_AT: 7, DIR: 8, NOTES: 9 };

// Active internal accounts (case-insensitive match)
const MY_ACCOUNTS = [
  'PC Financial',
  'Wealthsimple RRSP',
  'Wealthsimple Crypto',
  'Wealthsimple Cash',
  'CIBC Aventura',
  'CIBC Dividend',
  'Cash'
];

const MY_BANK_KEYWORDS = ['PC Financial', 'Wealthsimple', 'CIBC'];

// Gmail search settings
const GMAIL_LABEL = 'Transfers';
const GMAIL_LOOKBACK = 'newer_than:7d';

// Matching tolerances
const AMOUNT_TOLERANCE = 0.01; // $0.01
const TIME_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

// ========================================
// ================= MENUS =================
// ========================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Automation')
    .addItem('Process New Emails', 'processNewTransactions')
    .addSeparator()
    .addItem('Import from CSV', 'importFromCsv')
    .addItem('Suggest Categories', 'suggestCategoriesFromTransactions')
    .addSeparator()
    .addItem('Update Investment Values', 'updateInvestmentValues')
    .addSeparator()
    .addItem('Rebuild Dashboard', 'buildDashboard')
    .addItem('Learn Categories', 'learnCategories')
    .addItem('Apply Formatting', 'applyConditionalFormatting')
    .addToUi();
}

function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() === SHEETS.ACCOUNTS && range.getColumn() === ACC_COL.BAL && range.getRow() > 1) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const txSheet = ss.getSheetByName(SHEETS.MAIN);
    const accountName = sheet.getRange(range.getRow(), ACC_COL.NAME).getValue();
    const oldValue = parseFloat(e.oldValue || 0);
    const newValue = parseFloat(e.value || 0);
    const difference = newValue - oldValue;
    if (Math.abs(difference) > 0.001) {
      txSheet.appendRow([
        new Date(),
        difference,
        'Manual Correction',
        accountName,
        'Manual Adjustment',
        `Balance changed from ${toMoney(oldValue)} to ${toMoney(newValue)}`,
        `MANUAL-${new Date().getTime()}`,
        'Correction',
        'Adjustment'
      ]);
      sheet.getRange(range.getRow(), ACC_COL.UPDATED).setValue(new Date());
      _updateTotalNetWorth(txSheet, sheet);
    }
  }
}

// ========================================
// ============== MAIN FLOW ================
// ========================================

function processNewTransactions() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const accountsSheet = ss.getSheetByName(SHEETS.ACCOUNTS);
    const mainSheet = ss.getSheetByName(SHEETS.MAIN);
    if (!accountsSheet || !mainSheet) throw new Error('Missing required sheets.');

    _ensureStagingSheet(ss);

    _cleanupStaleStagingEntries(ss);
    _logNewEmails(ss);               // parses + logs or stages + attempts pairing
    _attemptAllPairings(ss);         // second pass pairing safeguard

    _updateTotalNetWorth(mainSheet, accountsSheet);
    _logNetWorthHistory(accountsSheet);
    learnCategories();
  } catch (e) {
    Logger.log(`FATAL ERROR in processNewTransactions: ${e.message}\n${e.stack}`);
  }
}

// ========================================
// ============ EMAIL INGESTION ============
// ========================================

function _logNewEmails(ss) {
  const mainSheet = ss.getSheetByName(SHEETS.MAIN);
  const stagingSheet = ss.getSheetByName(SHEETS.STAGING);
  const accountsSheet = ss.getSheetByName(SHEETS.ACCOUNTS);
  if (!mainSheet || !stagingSheet || !accountsSheet) throw new Error('Missing sheet(s).');

  // Known IDs for dedup
  const mainIds = mainSheet.getLastRow() > 1 ? mainSheet.getRange(2, TX_COL.ID, mainSheet.getLastRow() - 1, 1).getValues().flat() : [];
  const stgIds  = stagingSheet.getLastRow() > 1 ? stagingSheet.getRange(2, STG_COL.ID, stagingSheet.getLastRow() - 1, 1).getValues().flat() : [];
  const loggedIds = new Set([...(mainIds||[]), ...(stgIds||[])]);

  const threads = GmailApp.search(`label:${GMAIL_LABEL} ${GMAIL_LOOKBACK}`);
  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      try {
        const id = message.getId();
        if (loggedIds.has(id)) return; // already processed

        const fromEmail = (message.getFrom() || '').toLowerCase();
        const subject = message.getSubject() || '';
        const html = message.getBody() || '';
        const text = (message.getPlainBody() || '') + '\n' + htmlToText(html);

        let tx = null; // unified transaction shape

        if (fromEmail.includes('pcfinancial.ca')) {
          if (/purchase notice/i.test(subject)) {
            tx = parsePcMoneyPurchase(text, message);
            if (tx) {
              // If ambiguous or Wealthsimple-related, stage OUT
              const isWealthsimple = /wealthsimple/i.test(tx.merchant || '');
              if (!tx.merchant || isWealthsimple) {
                stageTransaction(stagingSheet, {
                  date: tx.date, amount: tx.amount, fromAccount: 'PC Financial', toAccount: tx.merchant || '',
                  bank: 'PC Money Purchase', emailId: tx.emailId, dir: 'OUT', notes: 'Ambiguous/Wealthsimple purchase'
                });
                _attemptPairForLatest(stagingSheet, ss);
              } else {
                appendAndUpdate(mainSheet, accountsSheet, {
                  date: tx.date,
                  amount: tx.amount,        // negative
                  fromAccount: 'PC Financial',
                  toAccount: tx.merchant,
                  bank: 'PC Money Purchase',
                  notes: 'Auto-logged (PAD)',
                  id: tx.emailId,
                  category: '',
                  type: 'PAD'
                });
              }
            }
          } else if (/bill payment/i.test(subject)) {
            // (Optional) implement if PCF sends separate bill payment emails
          } else if (/transfer to/i.test(subject)) {
            const t = parsePcInteracTransfer(text, message);
            if (t) {
              stageTransaction(stagingSheet, {
                date: t.date,
                amount: t.amount, // negative
                fromAccount: 'PC Financial',
                toAccount: t.toAccount,
                bank: t.bank,
                emailId: t.emailId,
                dir: 'OUT',
                notes: t.transferType
              });
              _attemptPairForLatest(stagingSheet, ss);
            }
          }
        } else if (fromEmail.includes('payments.interac.ca')) {
          const t = parseInteracDeposit(text, message);
          if (t) {
            // Stage IN to allow pairing with PCF/CIBC OUT
            stageTransaction(stagingSheet, {
              date: t.date,
              amount: t.amount, // positive
              fromAccount: t.fromAccount,
              toAccount: 'PC Financial', // default destination; adjust if you route elsewhere
              bank: t.bank,
              emailId: t.emailId,
              dir: 'IN',
              notes: t.transferType
            });
            _attemptPairForLatest(stagingSheet, ss);
          }
        } else if (fromEmail.includes('o.wealthsimple.com')) {
          const t = parseWealthsimpleDeposit(text, message);
          if (t) {
            stageTransaction(stagingSheet, {
              date: t.date,
              amount: t.amount, // positive
              fromAccount: 'PC Financial',
              toAccount: t.toAccount,
              bank: t.bank,
              emailId: t.emailId,
              dir: 'IN',
              notes: t.transferType
            });
            _attemptPairForLatest(stagingSheet, ss);
          }
        } else if (fromEmail.includes('support@wealthsimple.com') && /order has been filled/i.test(subject)) {
          const t = parseWealthsimpleTrade(text, message);
          if (t) {
            appendAndUpdate(mainSheet, accountsSheet, {
              date: t.date,
              amount: t.amount, // negative (cash spent)
              fromAccount: t.fromAccount, // 'Cash'
              toAccount: t.toAccount,     // Wealthsimple RRSP/Crypto
              bank: t.bank,
              notes: 'Auto-logged (Trade)',
              id: t.emailId,
              category: '',
              type: t.transferType
            });
          }
        } else if (fromEmail.includes('cibc')) {
          // Try payment first, then purchase
          const pay = parseCibcPayment(text, message) || parseCibcPaymentFromHtml(htmlToText(html), message);
          if (pay) {
            // Stage IN to card (we'll pair with PCF OUT if it exists)
            stageTransaction(stagingSheet, {
              date: pay.date,
              amount: pay.amount, // positive credit to card
              fromAccount: pay.fromAccount || 'Unknown Funding',
              toAccount: pay.toAccount,    // CIBC Aventura/Dividend
              bank: pay.bank,
              emailId: pay.emailId,
              dir: 'IN',
              notes: 'CIBC Card Payment'
            });
            _attemptPairForLatest(stagingSheet, ss);
          } else {
            const pur = parseCibcPurchase(text, message) || parseCibcPurchaseFromHtml(htmlToText(html), message);
            if (pur) {
              appendAndUpdate(mainSheet, accountsSheet, {
                date: pur.date,
                amount: pur.amount, // negative (purchase)
                fromAccount: pur.fromAccount, // CIBC Aventura/Dividend
                toAccount: pur.toAccount,     // Merchant
                bank: pur.bank,
                notes: 'Auto-logged (Purchase)',
                id: pur.emailId,
                category: '',
                type: 'Purchase'
              });
            }
          }
        }
      } catch (err) {
        Logger.log(`-> ERROR processing message: ${err.message}`);
      }
    });
  });
}

// ========================================
// ============ STAGING & PAIRING ==========
// ========================================

function _ensureStagingSheet(ss) {
  let stg = ss.getSheetByName(SHEETS.STAGING);
  if (!stg) {
    stg = ss.insertSheet(SHEETS.STAGING);
    stg.appendRow(['Date','Amount','From','To','Bank','EmailId','StagedAt','Direction','Notes']);
  }
}

function stageTransaction(stagingSheet, {date, amount, fromAccount, toAccount, bank, emailId, dir, notes}) {
  stagingSheet.appendRow([
    date || new Date(),
    amount,
    fromAccount || '',
    toAccount || '',
    bank || '',
    emailId || '',
    new Date(),
    dir || '',
    notes || ''
  ]);
}

function _attemptPairForLatest(stagingSheet, ss) {
  const lastRow = stagingSheet.getLastRow();
  if (lastRow < 2) return;
  _attemptPairingForRow(ss, lastRow);
}

function _attemptAllPairings(ss) {
  const stg = ss.getSheetByName(SHEETS.STAGING);
  if (!stg || stg.getLastRow() < 3) return;
  for (let r = 2; r <= stg.getLastRow(); r++) {
    _attemptPairingForRow(ss, r);
  }
}

function _attemptPairingForRow(ss, rowIndex) {
  const stg = ss.getSheetByName(SHEETS.STAGING);
  const main = ss.getSheetByName(SHEETS.MAIN);
  const accounts = ss.getSheetByName(SHEETS.ACCOUNTS);
  if (!stg || !main || !accounts) return;

  const last = stg.getRange(rowIndex, 1, 1, 9).getValues()[0];
  const a = {
    date: new Date(last[STG_COL.DATE-1]),
    amount: parseFloat(last[STG_COL.AMOUNT-1] || 0),
    from: (last[STG_COL.FROM-1] || '').toString(),
    to: (last[STG_COL.TO-1] || '').toString(),
    bank: (last[STG_COL.BANK-1] || '').toString(),
    id: (last[STG_COL.ID-1] || '').toString(),
    stagedAt: new Date(last[STG_COL.STAGED_AT-1] || new Date()),
    dir: (last[STG_COL.DIR-1] || '').toString(),
    notes: (last[STG_COL.NOTES-1] || '').toString()
  };

  // Find a counterpart with same abs(amount), opposite direction, within time window
  const stgData = stg.getRange(2, 1, stg.getLastRow()-1, 9).getValues();
  for (let i = 0; i < stgData.length; i++) {
    const idx = i + 2;
    if (idx === rowIndex) continue;
    const bRow = stgData[i];
    const b = {
      date: new Date(bRow[STG_COL.DATE-1]),
      amount: parseFloat(bRow[STG_COL.AMOUNT-1] || 0),
      from: (bRow[STG_COL.FROM-1] || '').toString(),
      to: (bRow[STG_COL.TO-1] || '').toString(),
      bank: (bRow[STG_COL.BANK-1] || '').toString(),
      id: (bRow[STG_COL.ID-1] || '').toString(),
      stagedAt: new Date(bRow[STG_COL.STAGED_AT-1] || new Date()),
      dir: (bRow[STG_COL.DIR-1] || '').toString(),
      notes: (bRow[STG_COL.NOTES-1] || '').toString()
    };

    const amountEqual = Math.abs(Math.abs(a.amount) - Math.abs(b.amount)) <= AMOUNT_TOLERANCE;
    const opposite = (a.dir === 'IN' && b.dir === 'OUT') || (a.dir === 'OUT' && b.dir === 'IN');
    const timeClose = Math.abs(a.date - b.date) <= TIME_WINDOW_MS;
    if (amountEqual && opposite && timeClose) {
      // Decide consolidated from/to
      let fromAcct, toAcct, amt;
      if (a.dir === 'OUT') {
        fromAcct = a.from || guessInternalAccount(a.bank) || 'Unknown Source';
        toAcct   = b.to   || guessInternalAccount(b.bank) || 'Unknown Dest';
        amt = a.amount; // negative
      } else {
        fromAcct = b.from || guessInternalAccount(b.bank) || 'Unknown Source';
        toAcct   = a.to   || guessInternalAccount(a.bank) || 'Unknown Dest';
        amt = b.amount; // negative from the OUT row
      }

      appendAndUpdate(main, accounts, {
        date: a.date > b.date ? a.date : b.date, // later of the two
        amount: amt, // negative amount (cash leaves the from account)
        fromAccount: fromAcct,
        toAccount: toAcct,
        bank: 'Internal Transfer',
        notes: `Paired ${a.id} ↔ ${b.id}`,
        id: `${a.id}|${b.id}`,
        category: 'Transfer',
        type: 'Internal Transfer'
      });

      // Delete the two staging rows (delete lower index first)
      const first = Math.min(rowIndex, idx);
      const second = Math.max(rowIndex, idx);
      stg.deleteRow(second);
      stg.deleteRow(first);
      return; // paired
    }
  }
}

function _cleanupStaleStagingEntries(ss) {
  const mainSheet = ss.getSheetByName(SHEETS.MAIN);
  const stagingSheet = ss.getSheetByName(SHEETS.STAGING);
  const accountsSheet = ss.getSheetByName(SHEETS.ACCOUNTS);
  if (!stagingSheet || stagingSheet.getLastRow() < 2) return;

  const now = new Date();
  const rows = stagingSheet.getRange(2, 1, stagingSheet.getLastRow() - 1, 9).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    const rowIdx = i + 2;
    const r = rows[i];
    const stagedAt = new Date(r[STG_COL.STAGED_AT-1] || now);
    const isOld = (now - stagedAt) > TIME_WINDOW_MS;
    if (isOld) {
      const stale = {
        date: new Date(r[STG_COL.DATE-1] || now),
        amount: parseFloat(r[STG_COL.AMOUNT-1] || 0),
        fromAccount: r[STG_COL.FROM-1] || 'Unknown',
        toAccount: r[STG_COL.DIR-1] === 'IN' ? (r[STG_COL.TO-1] || 'Bill Payment (Payee Unknown)') : (r[STG_COL.TO-1] || 'External'),
        bank: (r[STG_COL.BANK-1] || 'Staged'),
        id: r[STG_COL.ID-1] || `STALE-${Date.now()}`,
        notes: 'Auto-logged (Stale)',
        category: '',
        type: r[STG_COL.DIR-1] === 'IN' ? 'Incoming (Unpaired)' : 'Outgoing (Unpaired)'
      };
      appendAndUpdate(mainSheet, accountsSheet, stale);
      stagingSheet.deleteRow(rowIdx);
    }
  }
}

// ========================================
// =============== PARSERS =================
// ========================================

function parseInteracDeposit(text, message) {
  const amt = matchAmount(text, /sent you \$([0-9,]+\.[0-9]{2})/i);
  if (!amt) return null;
  const senderMatch = text.match(/([^\n]+) sent you \$/i);
  const sender = senderMatch ? senderMatch[1].trim() : 'Unknown Sender';
  return {
    date: message.getDate(),
    amount: parseFloat(amt),
    fromAccount: `e-Transfer from ${sender}`,
    toAccount: 'Your Bank Account',
    bank: `Interac Deposit (${message.getSubject()})`,
    transferType: MY_BANK_KEYWORDS.some(b => message.getSubject().toLowerCase().includes(b.toLowerCase())) ? 'Internal Transfer' : 'External Transfer',
    emailId: message.getId()
  };
}

function parsePcMoneyPurchase(text, message) {
  const amt = matchAmount(text, /Purchase\s*amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) || matchAmount(text, /Amount[:\s]*\$([0-9,]+\.[0-9]{2})/i);
  if (!amt) return null;
  const dateMatch = text.match(/Transaction\s*date[:\s]*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  const merchantMatch = text.match(/Merchant\s*:\s*(.+)/i);
  return {
    date: dateMatch ? new Date(dateMatch[1]) : message.getDate(),
    amount: -parseFloat(amt),
    merchant: merchantMatch ? merchantMatch[1].trim() : null,
    emailId: message.getId()
  };
}

function parsePcInteracTransfer(text, message) {
  const subject = message.getSubject() || '';
  const amountMatch = subject.match(/\$([0-9,]+\.[0-9]{2})/);
  const recipientMatch = subject.match(/transfer\s+to\s+(.+)\s+has\s+been/i);
  const dateMatch = text.match(/([A-Za-z]{3}\s+\d{1,2},\s*\d{4})/i);
  if (!amountMatch || !recipientMatch) return null;
  const rawRecipient = recipientMatch[1].trim();
  const toAccount = MY_ACCOUNTS.some(acc => includesCi(rawRecipient, acc)) ? rawRecipient : `External to ${rawRecipient}`;
  return {
    date: dateMatch ? new Date(dateMatch[1]) : message.getDate(),
    amount: -parseFloat(amountMatch[1].replace(/,/g,'')),
    toAccount,
    bank: 'PC Financial e-Transfer',
    transferType: includesAnyCi(rawRecipient, MY_ACCOUNTS) ? 'Internal Transfer' : 'External Transfer',
    emailId: message.getId()
  };
}

function parseWealthsimpleDeposit(text, message) {
  const amountMatch = text.match(/Amount\s*:\s*\$([0-9,]+\.[0-9]{2})\s*CAD/i);
  const toMatch = text.match(/To\s*:\s*([\s\S]*?)\s*Sometimes/i);
  if (!amountMatch || !toMatch) return null;
  const raw = toMatch[1].replace(/\n/g,' ').trim().toLowerCase();
  let acct = 'Wealthsimple';
  if (raw.includes('rrsp')) acct = 'Wealthsimple RRSP';
  else if (raw.includes('crypto')) acct = 'Wealthsimple Crypto';
  else if (raw.includes('cash')) acct = 'Wealthsimple Cash';
  return {
    date: message.getDate(),
    amount: parseFloat(amountMatch[1].replace(/,/g,'')),
    fromAccount: 'PC Financial',
    toAccount: acct,
    bank: 'Wealthsimple Deposit',
    transferType: 'Internal Transfer',
    emailId: message.getId()
  };
}

function parseWealthsimpleTrade(text, message) {
  const m = text.match(/(\d+\.?\d*)\s+shares\s+of\s+([A-Z\.]+)[\s\S]+?Total cost:\s*\$([0-9,]+\.[0-9]+)[\s\S]+?Account:\s*([\s\S]*?)\s*Time:/i);
  if (!m) return null;
  const shares = parseFloat(m[1]);
  const ticker = m[2].trim();
  const amt = parseFloat(m[3].replace(/,/g,''));
  const rawAcct = m[4].replace(/\n/g,' ').toLowerCase();
  let acct = 'Wealthsimple Trade';
  if (rawAcct.includes('rrsp')) acct = 'Wealthsimple RRSP';
  else if (rawAcct.includes('crypto')) acct = 'Wealthsimple Crypto';
  _updateHoldings(acct, ticker, shares);
  return {
    date: message.getDate(),
    amount: -amt,
    fromAccount: 'Cash',
    toAccount: acct,
    bank: 'Wealthsimple Trade',
    transferType: 'Internal Transfer',
    emailId: message.getId()
  };
}

// CIBC purchase — robust patterns (EN, tolerate spacing) & fallback to HTML-stripped text
function parseCibcPurchase(text, message) {
  // Examples: "Amount: $12.34" and "at MERCHANT" & card type in body
  const amount = matchAmount(text, /Amount\s*:\s*\$([0-9,]+\.[0-9]{2})/i) || matchAmount(text, /\$([0-9,]+\.[0-9]{2})\s*(?:at|@)/i);
  const merchantMatch = text.match(/\bat\s+([A-Z0-9\s\.&'\-_/]+?)\s+(?:was|on|\()/i);
  const cardMatch = text.match(/CIBC\s+(Aventura|Dividend)[\s\S]*?ending\s+in\s+(\d{4})/i);
  if (!amount || !merchantMatch || !cardMatch) return null;
  const cardLabel = `CIBC ${cardMatch[1]}`;
  return {
    date: message.getDate(),
    amount: -parseFloat(amount),
    fromAccount: cardLabel,
    toAccount: merchantMatch[1].trim(),
    bank: `${cardLabel} Purchase`,
    emailId: message.getId()
  };
}
function parseCibcPurchaseFromHtml(text, message) { return parseCibcPurchase(text, message); }

// CIBC payment to card — covers subjects like "New payment to your credit card"
function parseCibcPayment(text, message) {
  // Look for: Payment of $X has been applied/received to your CIBC <Card> ending in NNNN
  const amount = matchAmount(text, /Payment\s+of\s+\$([0-9,]+\.[0-9]{2})/i) || matchAmount(text, /\$([0-9,]+\.[0-9]{2})\s+payment/i);
  const cardMatch = text.match(/your\s+CIBC\s+(Aventura|Dividend)[\s\S]*?ending\s+in\s+(\d{4})/i);
  if (!amount || !cardMatch) return null;
  const cardLabel = `CIBC ${cardMatch[1]}`;
  return {
    date: message.getDate(),
    amount: parseFloat(amount), // positive credit to the card
    fromAccount: 'PC Financial', // best-guess (will be paired/overridden by staging)
    toAccount: cardLabel,
    bank: `${cardLabel} Payment`,
    emailId: message.getId()
  };
}
function parseCibcPaymentFromHtml(text, message) { return parseCibcPayment(text, message); }

// ========================================
// =========== SHEET OPERATIONS ============
// ========================================

function appendAndUpdate(mainSheet, accountsSheet, tx) {
  // Duplicate guard: both by Email ID and by fingerprint
  const lastRow = mainSheet.getLastRow();
  const ids = lastRow > 1 ? mainSheet.getRange(2, TX_COL.ID, lastRow - 1, 1).getValues().flat() : [];
  if (tx.id && ids.includes(tx.id)) return;

  const fp = fingerprint(tx);
  const fps = lastRow > 1 ? mainSheet.getRange(2, TX_COL.NOTES, lastRow - 1, 1).getValues().flat() : [];
  if (fps.some(n => (n||'').toString().includes(fp))) return;

  mainSheet.appendRow([
    tx.date || new Date(),
    tx.amount || 0,
    tx.fromAccount || '',
    tx.toAccount || '',
    tx.bank || '',
    `${tx.notes || ''} [fp:${fp}]`,
    tx.id || `GEN-${Date.now()}`,
    tx.category || '',
    tx.type || ''
  ]);

  _updateAccountBalances({ fromAccount: tx.fromAccount, toAccount: tx.toAccount, amount: tx.amount }, accountsSheet);
}

function _updateAccountBalances(parsedData, accountsSheet) {
  const { fromAccount, toAccount, amount } = parsedData;
  const data = accountsSheet.getDataRange().getValues();

  const findRow = (name) => {
    if (!name) return -1;
    const n = name.toLowerCase();
    for (let i = 1; i < data.length; i++) {
      const cur = (data[i][ACC_COL.NAME-1]||'').toString().toLowerCase();
      if (cur && (cur === n)) return i + 1; // 1-based
    }
    return -1;
  };

  const upd = (row, delta) => {
    const bal = parseFloat(accountsSheet.getRange(row, ACC_COL.BAL).getValue()) || 0;
    accountsSheet.getRange(row, ACC_COL.BAL).setValue(bal + delta);
    accountsSheet.getRange(row, ACC_COL.UPDATED).setValue(new Date());
  };

  const fromRow = findRow(fromAccount);
  if (fromRow !== -1) upd(fromRow, amount);

  const toRow = findRow(toAccount);
  if (toRow !== -1) {
    const internalOut = fromAccount && includesAnyCi(fromAccount, MY_ACCOUNTS);
    const add = internalOut ? Math.abs(amount) : amount;
    upd(toRow, add);
  }
}

function _updateTotalNetWorth(mainSheet, accountsSheet) {
  if (accountsSheet.getLastRow() < 2) return;
  const balances = accountsSheet.getRange(2, ACC_COL.BAL, accountsSheet.getLastRow() - 1, 1).getValues();
  const total = balances.reduce((s, r) => s + parseFloat(r[0] || 0), 0);
  mainSheet.getRange('K1').setValue('Total Net Worth:').setFontWeight('bold');
  mainSheet.getRange('L1').setValue(total).setNumberFormat('$#,##0.00');
}

function _logNetWorthHistory(accountsSheet) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.NETWORTH);
  if (!sheet) sheet = ss.insertSheet(SHEETS.NETWORTH).appendRow(['Date','Net Worth']);

  const today = new Date();
  const lastRow = sheet.getLastRow();
  const balances = accountsSheet.getRange(2, ACC_COL.BAL, accountsSheet.getLastRow() - 1, 1).getValues();
  const total = balances.reduce((s, r) => s + parseFloat(r[0] || 0), 0);

  if (lastRow > 1) {
    const lastDate = new Date(sheet.getRange(lastRow, 1).getValue());
    if (lastDate.toDateString() === today.toDateString()) {
      sheet.getRange(lastRow, 2).setValue(total);
      return;
    }
  }
  sheet.appendRow([today, total]);
}

// ========================================
// =============== DASHBOARD ===============
// ========================================

function buildDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let dash = ss.getSheetByName(SHEETS.DASHBOARD);
  if (dash) ss.deleteSheet(dash);
  dash = ss.insertSheet(SHEETS.DASHBOARD, 0);
  dash.getRange('A1').setValue('Financial Dashboard').setFontSize(14).setFontWeight('bold');

  const tx = ss.getSheetByName(SHEETS.MAIN);
  const nw = ss.getSheetByName(SHEETS.NETWORTH);

  // ---- Expenses by Category ($ SUM, last 30 days) ----
  if (tx && tx.getLastRow() > 1) {
    const txData = tx.getRange(2, 1, tx.getLastRow()-1, TX_COL.CATEGORY).getValues();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);

    const idx = {
      date: TX_COL.DATE - 1,
      amount: TX_COL.AMOUNT - 1,
      cat: TX_COL.CATEGORY - 1
    };

    const totals = {};
    txData.forEach((row, i) => {
      const d = new Date(row[idx.date]);
      const amt = parseFloat(row[idx.amount] || 0);
      const cat = (row[idx.cat] || 'Uncategorized').toString();
      if (d >= cutoff && amt < 0) totals[cat] = (totals[cat] || 0) + Math.abs(amt);
    });

    const arr = [['Category','Amount']];
    Object.keys(totals).forEach(k => arr.push([k, totals[k]]));

    const range = dash.getRange(2, 10, arr.length, 2); // J2
    range.setValues(arr);

    const pie1 = dash.newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(range)
      .setOption('title','Expenses by Category (Last 30 Days, $)')
      .setPosition(2, 1, 0, 0)
      .build();
    dash.insertChart(pie1);
    dash.hideColumns(10, 2); // hide J:K helper
  }

  // ---- Category Distribution (COUNT of items) ----
  if (tx && tx.getLastRow() > 1) {
    const cats = tx.getRange(2, TX_COL.CATEGORY, tx.getLastRow()-1, 1).getValues().flat().map(c => c || 'Uncategorized');
    const counts = cats.reduce((m, c) => (m[c] = (m[c]||0)+1, m), {});
    const arr2 = [['Category','Count']];
    Object.keys(counts).forEach(k => arr2.push([k, counts[k]]));
    const range2 = dash.getRange(2, 13, arr2.length, 2); // M2
    range2.setValues(arr2);

    const pie2 = dash.newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(range2)
      .setOption('title','Category Distribution (Count of Transactions)')
      .setPosition(20, 1, 0, 0)
      .build();
    dash.insertChart(pie2);
    dash.hideColumns(13, 2); // hide M:N helper
  }

  // ---- Net Worth Over Time ----
  if (nw && nw.getLastRow() > 1) {
    const chart = dash.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(nw.getRange(1,1,nw.getLastRow(),2))
      .setOption('title','Net Worth Over Time')
      .setPosition(38, 1, 0, 0)
      .build();
    dash.insertChart(chart);
  }
}

function applyConditionalFormatting() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tx = ss.getSheetByName(SHEETS.MAIN);
  const acc = ss.getSheetByName(SHEETS.ACCOUNTS);

  if (tx) {
    const range = tx.getRange(`B2:B${tx.getMaxRows()}`);
    tx.clearConditionalFormatRules();
    tx.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor('#FF0000').setRanges([range]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor('#008000').setRanges([range]).build()
    ]);
  }
  if (acc) {
    const range = acc.getRange(`B2:B${acc.getMaxRows()}`);
    acc.clearConditionalFormatRules();
    acc.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setBackground('#f8d7da').setRanges([range]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground('#d4edda').setRanges([range]).build()
    ]);
  }
}

// ========================================
// ========= CATEGORIES (LEARNING) =========
// ========================================

function learnCategories() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tx = ss.getSheetByName(SHEETS.MAIN);
  const cats = ss.getSheetByName(SHEETS.CATEGORIES);
  if (!tx || !cats || cats.getLastRow() < 2 || tx.getLastRow() < 2) return;

  // Map of keyword -> category
  const catData = cats.getRange(2,1,cats.getLastRow()-1,2).getValues();
  const rules = catData.filter(r => (r[0]||'').toString().trim()).map(r => ({
    keyword: r[0].toString().toLowerCase(),
    category: (r[1]||'').toString()
  }));
  if (!rules.length) return;

  const lastRow = tx.getLastRow();
  for (let i = 2; i <= lastRow; i++) {
    const currentCat = (tx.getRange(i, TX_COL.CATEGORY).getValue() || '').toString();
    if (currentCat) continue; // only fill empty
    const fromVal = (tx.getRange(i, TX_COL.FROM).getValue() || '').toString().toLowerCase();
    const toVal   = (tx.getRange(i, TX_COL.TO).getValue()   || '').toString().toLowerCase();
    const bankVal = (tx.getRange(i, TX_COL.BANK).getValue() || '').toString().toLowerCase();
    const hay = `${fromVal} ${toVal} ${bankVal}`;
    for (const rule of rules) {
      if (hay.includes(rule.keyword)) {
        tx.getRange(i, TX_COL.CATEGORY).setValue(rule.category);
        break;
      }
    }
  }
}

function suggestCategoriesFromTransactions() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tx = ss.getSheetByName(SHEETS.MAIN);
  let cat = ss.getSheetByName(SHEETS.CATEGORIES);
  if (!cat) {
    cat = ss.insertSheet(SHEETS.CATEGORIES);
    cat.appendRow(['Keyword','Category']);
  }
  if (!tx || tx.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'Transactions' sheet is empty.");
    return;
  }

  const data = tx.getRange(2, TX_COL.TO, tx.getLastRow()-1, 1).getValues();
  const counts = {};
  const common = new Set(['payment','transfer','inc','ltd','corp','on','toronto','thank','you','ltd/ltée','e-transfer']);

  data.forEach(r => {
    const desc = (r[0]||'').toString().toLowerCase();
    const clean = desc.replace(/internet banking|e-transfer from|payment thank you\/paiemen t merci|external to/gi,'').trim();
    const parts = clean.split(/\s{2,}|,|-/);
    parts.forEach(p => {
      const x = p.replace(/[\*#\d\-]/g,' ').trim();
      if (x.length > 3 && !common.has(x)) counts[x] = (counts[x]||0)+1;
    });
  });

  const existing = cat.getLastRow() > 1 ? cat.getRange(2,1,cat.getLastRow()-1,1).getValues().flat().map(c => (c||'').toString().toLowerCase()) : [];
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);

  let added = 0;
  sorted.forEach(([k,c]) => {
    if (c>1 && !existing.includes(k.toLowerCase())) { cat.appendRow([k.toUpperCase(), '']); added++; }
  });

  SpreadsheetApp.getUi().alert(`${added} new category keywords suggested. Review the 'Categories' sheet to assign categories.`);
}

// ========================================
// ============= CSV IMPORTER ==============
// ========================================

function importFromCsv() {
  const profiles = [
    { name: 'CIBC Aventura Card', identifyingKeyword: '4500********6271', accountName: 'CIBC Aventura', columnMap: { date: 1, description: 2, debit: 3, credit: 4 } },
    { name: 'CIBC Dividend Card', identifyingKeyword: '4505********2866', accountName: 'CIBC Dividend', columnMap: { date: 1, description: 2, debit: 3, credit: 4 } },
    { name: 'PC Financial Cash Account', identifyingKeyword: 'Card Holder Name', accountName: 'PC Financial', columnMap: { date: 4, description: 1, amount: 6 } },
    { name: 'PC Financial Savings Account', identifyingKeyword: 'Transfer In', accountName: 'PC Financial', columnMap: { date: 3, description: 1, amount: 5 } },
    { name: 'Wealthsimple RRSP', identifyingKeyword: 'Vanguard FTSE Canada Index ETF', accountName: 'Wealthsimple RRSP', columnMap: { date: 1, description: 3, amount: 4 } },
    { name: 'Wealthsimple Crypto', identifyingKeyword: 'Dogecoin', accountName: 'Wealthsimple Crypto', columnMap: { date: 1, description: 3, amount: 4 } }
  ];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const importSheet = ss.getSheetByName(SHEETS.CSV_IMPORT);
  const txSheet = ss.getSheetByName(SHEETS.MAIN);

  if (!importSheet || importSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("The 'CSV_Import' sheet is empty.");
    return;
  }

  const importData = importSheet.getRange(1,1,importSheet.getLastRow(),importSheet.getLastColumn()).getValues();

  // Detect profile
  let profile = null;
  for (const row of importData) {
    const rowText = row.join(' ').toLowerCase();
    for (const p of profiles) {
      if (rowText.includes(p.identifyingKeyword.toLowerCase())) { profile = p; break; }
    }
    if (profile) break;
  }
  if (!profile) { SpreadsheetApp.getUi().alert('Could not identify the bank from the CSV data.'); return; }

  SpreadsheetApp.getUi().alert(`Detected "${profile.name}" format. Starting import...`);

  const existing = txSheet.getDataRange().getValues();
  const existingKeys = new Set(existing.map(r => `${new Date(r[TX_COL.DATE-1]).toDateString()}|${toFixedSafe(r[TX_COL.AMOUNT-1])}|${r[TX_COL.TO-1]}`));

  let added = 0;
  importData.forEach(row => {
    const map = profile.columnMap;
    const dateValue = row[map.date - 1];
    const txDate = parseCsvDate(dateValue);
    if (!txDate) return;
    const desc = row[map.description - 1];
    let amount;
    if (map.amount) amount = parseFloat(row[map.amount - 1] || 0);
    else {
      const debit = parseFloat(row[map.debit - 1] || 0);
      const credit = parseFloat(row[map.credit - 1] || 0);
      amount = credit - debit;
    }
    if (!desc || !amount) return;

    const key = `${txDate.toDateString()}|${toFixedSafe(amount)}|${desc}`;
    if (!existingKeys.has(key)) {
      const fromAccount = amount < 0 ? profile.accountName : desc;
      const toAccount   = amount > 0 ? profile.accountName : desc;
      appendAndUpdate(txSheet, ss.getSheetByName(SHEETS.ACCOUNTS), {
        date: txDate,
        amount,
        fromAccount,
        toAccount,
        bank: 'CSV Import',
        notes: `Imported from ${profile.name}`,
        id: `CSV-${Date.now()}-${added}`,
        category: '',
        type: 'CSV Import'
      });
      added++;
    }
  });

  importSheet.clearContents();
  SpreadsheetApp.getUi().alert(`Import complete. Added ${added} new transaction(s) for "${profile.name}".`);
}

// ========================================
// ============= HOLDINGS / PRICES =========
// ========================================

function updateInvestmentValues() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const holdings = ss.getSheetByName(SHEETS.HOLDINGS);
  const accounts = ss.getSheetByName(SHEETS.ACCOUNTS);
  if (!holdings || holdings.getLastRow() < 2) { SpreadsheetApp.getUi().alert("The 'Holdings' sheet is empty or missing."); return; }

  const rows = holdings.getRange(2,1,holdings.getLastRow()-1,3).getValues();
  const totals = {};
  rows.forEach(r => {
    const acct = r[0]; const ticker = r[1]; const shares = parseFloat(r[2]);
    if (!acct || !ticker || isNaN(shares)) return;
    try {
      const url = `https://finance.yahoo.com/quote/${ticker}`;
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const content = res.getContentText();
      const m = content.match(new RegExp(`"${ticker}":{[^}]+"regularMarketPrice":{[^}]*?"fmt":"([\\d,]+\\.\\d+)"`));
      if (m && m[1]) {
        const price = parseFloat(m[1].replace(/,/g,''));
        totals[acct] = (totals[acct]||0) + shares * price;
      }
    } catch(err) {
      Logger.log(`Error fetching ${ticker}: ${err.message}`);
    }
  });

  const accData = accounts.getDataRange().getValues();
  const idxMap = new Map(accData.slice(1).map((r,i) => [r[ACC_COL.NAME-1], i+2]));
  Object.entries(totals).forEach(([acct,val]) => {
    if (idxMap.has(acct)) {
      const row = idxMap.get(acct);
      accounts.getRange(row, ACC_COL.BAL).setValue(val);
      accounts.getRange(row, ACC_COL.UPDATED).setValue(new Date());
    }
  });

  SpreadsheetApp.getUi().alert('Investment values have been updated.');
  _updateTotalNetWorth(ss.getSheetByName(SHEETS.MAIN), accounts);
}

function _updateHoldings(accountName, ticker, sharesToAdd) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.HOLDINGS);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === accountName && data[i][1] === ticker) {
      const cur = parseFloat(data[i][2]) || 0;
      sheet.getRange(i+1,3).setValue(cur + sharesToAdd);
      return;
    }
  }
  sheet.appendRow([accountName, ticker, sharesToAdd]);
}

// ========================================
// ================ UTILS ==================
// ========================================

function matchAmount(text, regex) {
  const m = text.match(regex);
  return m ? m[1].replace(/,/g,'') : null;
}

function fingerprint(tx) {
  const d = tx.date ? new Date(tx.date) : new Date();
  const key = [d.toISOString().slice(0,10), toFixedSafe(tx.amount), (tx.fromAccount||'').slice(0,30), (tx.toAccount||'').slice(0,30)].join('|');
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key)).slice(0,12);
}

function htmlToText(html) { return html.replace(/<\s*br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }

function parseCsvDate(val) {
  if (val instanceof Date) return val;
  const s = (val||'').toString().trim();
  // Try DD-MM-YYYY
  let m = s.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
  if (m) return new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10));
  // Try YYYY-MM-DD
  m = s.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
  if (m) return new Date(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10));
  // Fallback
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function toFixedSafe(n) { const x = parseFloat(n||0); return isNaN(x) ? '0.00' : x.toFixed(2); }
function toMoney(n) { return `$${toFixedSafe(n)}`; }
function includesCi(a,b) { return (a||'').toString().toLowerCase().includes((b||'').toString().toLowerCase()); }
function includesAnyCi(hay, arr) { return arr.some(x => includesCi(hay,x)); }
function guessInternalAccount(label) { return MY_ACCOUNTS.find(a => includesCi(label,a)) || ''; }
