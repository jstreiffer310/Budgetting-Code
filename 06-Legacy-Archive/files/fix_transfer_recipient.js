function _parseInteracEmail(message, subject, body) {
  try {
    const amount = _extractAmount(body, /sent you \$([0-9,]+\.[0-9]{2})/i) ||
                  _extractAmount(body, /amount[:\s]*\$([0-9,]+\.[0-9]{2})/i);
    
    if (!amount) return null;
    
    // Extract sender with multiple pattern matches
    const sender = _extractText(body, /([A-Za-z0-9 .'-]+) sent you \$/i) || 
                  _extractText(body, /From:[\s]*([A-Za-z0-9 .'-]+)/i) ||
                  _extractText(subject, /from ([A-Za-z0-9 .'-]+)/i) || 
                  'Interac Sender';
    
    // Create transaction with PENDING flag for manual review
    return {
      date: message.getDate(),
      amount: amount,
      direction: 'IN',
      fromAccount: `e-Transfer from ${sender}`,
      toAccount: 'PC Financial', // Default deposit account
      bank: 'Interac Deposit',
      emailId: message.getId(),
      type: 'Interac',
      notes: `Received from ${sender}`,
      pending: false // We have adequate information here
    };
  } catch (error) {
    _logError('Failed to parse Interac email', error);
    return null;
  }
}

function _parsePcFinancialEmail(message, subject, body) {
  try {
    const subjectLower = _lc(subject);
    const bodyLower = _lc(body);
    
    // Purchase notice
    if (subjectLower.includes('purchase notice') || /purchase amount/i.test(bodyLower)) {
      const amount = _extractAmount(body, /purchase amount[:\s]*\$([0-9,]+\.[0-9]{2})/i) ||
                    _extractAmount(body);
      if (!amount) return null;
      
      const merchant = _extractText(body, /merchant[:\s]*([^\n\r]+)/i) ||
                      _extractText(body, /at\s+([A-Z0-9 \._\-&']+)/i) ||
                      'Merchant';
      
      // Check if this is a Wealthsimple deposit (should be staged)
      if (/wealthsimple/i.test(merchant)) {
        return {
          date: message.getDate(),
          amount: -Math.abs(amount),
          direction: 'OUT',
          fromAccount: 'PC Financial',
          toAccount: 'Pending Wealthsimple',
          bank: 'PC Financial Purchase',
          emailId: message.getId(),
          type: 'Transfer',
          shouldStage: true,
          notes: `Wealthsimple deposit - awaiting confirmation`
        };
      }
      
      return {
        date: message.getDate(),
        amount: -Math.abs(amount),
        direction: 'OUT',
        fromAccount: 'PC Financial',
        toAccount: merchant,
        bank: 'PC Financial Purchase',
        emailId: message.getId(),
        type: 'Purchase',
        notes: `Purchase at ${merchant}`
      };
    }
    
    // E-transfer sent
    if (subjectLower.includes('transfer to') || /e-transfer/i.test(bodyLower)) {
      const amount = _extractAmount(subject) || _extractAmount(body);
      if (!amount) return null;
      
      // Try multiple patterns to extract recipient
      const recipient = _extractText(subject, /transfer to\s+(.+?)\s+has been/i) ||
                       _extractText(body, /transfer to\s+(.+?)\s+has been/i) ||
                       _extractText(body, /recipient:[\s]*([^\n\r]+)/i) ||
                       _extractText(body, /to:[\s]*([^\n\r]+)/i);
      
      // Check if we failed to extract a recipient
      if (!recipient) {
        return {
          date: message.getDate(),
          amount: -Math.abs(amount),
          direction: 'OUT',
          fromAccount: 'PC Financial',
          toAccount: 'Pending - Unknown Recipient',
          bank: 'PC Financial e-Transfer',
          emailId: message.getId(),
          type: 'External Transfer',
          pending: true, // Flag for manual review
          notes: 'Unable to determine recipient - needs manual review'
        };
      }
      
      // Check if this is an internal transfer
      const normalizedRecipient = _normalizeAccountName(recipient);
      const isInternal = _isInternalAccount(normalizedRecipient);
      
      return {
        date: message.getDate(),
        amount: -Math.abs(amount),
        direction: 'OUT',
        fromAccount: 'PC Financial',
        toAccount: isInternal ? normalizedRecipient : `External to ${recipient}`,
        bank: 'PC Financial e-Transfer',
        emailId: message.getId(),
        type: isInternal ? 'Internal Transfer' : 'External Transfer',
        shouldStage: isInternal,
        notes: isInternal ? `Internal transfer to ${normalizedRecipient}` : `External transfer to ${recipient}`
      };
    }
    
    return null;
  } catch (error) {
    _logError('Failed to parse PC Financial email', error);
    return null;
  }
}