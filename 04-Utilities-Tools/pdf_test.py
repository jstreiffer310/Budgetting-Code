# PDF Processing Test
import sys
import os

def test_pdf_libraries():
    print("🧪 Testing PDF processing libraries...")
    
    # Test PyPDF2
    try:
        import PyPDF2
        print("✅ PyPDF2 available")
        pdf_readers = ['PyPDF2']
    except ImportError:
        print("❌ PyPDF2 not available")
        pdf_readers = []
    
    # Test pdfplumber
    try:
        import pdfplumber
        print("✅ pdfplumber available")
        pdf_readers.append('pdfplumber')
    except ImportError:
        print("❌ pdfplumber not available")
    
    return pdf_readers

def test_pdf_file(file_path):
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    print(f"📄 Testing PDF file: {file_path}")
    
    # Test with PyPDF2
    try:
        import PyPDF2
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            num_pages = len(pdf_reader.pages)
            print(f"✅ PyPDF2: {num_pages} pages detected")
            
            if num_pages > 0:
                first_page = pdf_reader.pages[0]
                text_preview = first_page.extract_text()[:200]
                print(f"📝 Text preview: {text_preview}...")
                return True
    except Exception as e:
        print(f"❌ PyPDF2 failed: {e}")
    
    # Test with pdfplumber
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            num_pages = len(pdf.pages)
            print(f"✅ pdfplumber: {num_pages} pages detected")
            
            if num_pages > 0:
                first_page = pdf.pages[0]
                text_preview = first_page.extract_text()[:200]
                print(f"📝 Text preview: {text_preview}...")
                return True
    except Exception as e:
        print(f"❌ pdfplumber failed: {e}")
    
    return False

if __name__ == "__main__":
    # Test libraries
    available_readers = test_pdf_libraries()
    
    if not available_readers:
        print("❌ No PDF libraries available")
        sys.exit(1)
    
    # Test with a sample PDF if provided
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        success = test_pdf_file(pdf_file)
        if success:
            print("✅ PDF processing test successful")
        else:
            print("❌ PDF processing test failed")
    else:
        print("💡 Usage: python pdf_test.py <pdf_file>")
        print("✅ PDF libraries are available for use")
