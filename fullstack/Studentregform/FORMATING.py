import os
from docx import Document
from docx.shared import Pt, Mm
from docx.enum.text import WD_ALIGN_PARAGRAPH

def set_a5_page_layout(doc):
    """Sets the document sections to A5 size with narrow margins."""
    for section in doc.sections:
        section.page_height = Mm(210)
        section.page_width = Mm(148)
        section.left_margin = Mm(12.7)
        section.right_margin = Mm(12.7)
        section.top_margin = Mm(12.7)
        section.bottom_margin = Mm(12.7)

def format_document_to_a5(input_path, output_path):
    # Check if file exists
    if not os.path.exists(input_path):
        print(f"Error: The file '{input_path}' was not found.")
        return

    # Load the document
    doc = Document(input_path)
    
    # 1. SET PAGE SIZE TO A5
    set_a5_page_layout(doc)

    print("Formatting paragraphs...")

    # 2. ITERATE AND FORMAT TEXT
    for para in doc.paragraphs:
        text = para.text.strip()
        text_lower = text.lower()

        # Skip empty lines to keep document tight
        if not text:
            continue

        # --- LOGIC TO IDENTIFY SECTIONS ---
        
        # A. ABSTRACT (Size 9, Justified)
        if text_lower.startswith("abstract"):
            para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            for run in para.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(9)
                # Bold the word "Abstract" if found
                if "abstract" in run.text.lower():
                    run.font.bold = True

        # B. KEYWORDS (Size 9, Left Aligned)
        elif text_lower.startswith("keywords"):
            para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in para.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(9)
                # Bold the word "Keywords"
                if "keywords" in run.text.lower():
                    run.font.bold = True
            
            # Add a separator line after keywords (End of project)
            para.paragraph_format.space_after = Pt(12)

        # C. PROBLEM STATEMENT / SDG GOALS (Size 10, Left Aligned)
        elif "problem statement" in text_lower or "sdg goals" in text_lower or "hackathon" in text_lower:
            para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in para.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10)
                run.font.bold = True

        # D. CORRESPONDING AUTHOR / EMAIL (Size 10, Left Aligned)
        elif "email" in text_lower or "corresponding author" in text_lower:
            para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in para.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10)
                run.font.bold = False

        # E. DEFAULT: TITLES, NAMES, COLLEGES (Size 10, Center Aligned)
        # Assuming everything else is header info
        else:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10)
                # Heuristic: If it's short and uppercase or in quotes, bold it (Likely Title/Name)
                if len(text) < 100 or text.isupper() or '"' in text or '“' in text:
                    run.font.bold = True
                else:
                    run.font.bold = False # College name usually normal weight

    # Save the new file
    doc.save(output_path)
    print(f"Success! Formatted A5 document saved to: {output_path}")

# ==========================================
# PASTE YOUR FILE PATH HERE
# ==========================================
# Example: input_file_path = r"C:\Users\Name\Documents\MyRawFile.docx"

input_file_path = r"C:\Users\sanna\Downloads\Mahindra ^0 trubo.docx"  # <--- REPLACE THIS
output_file_path = r"C:\Users\sanna\Downloads\Output_A5_Formatted.docx"

if __name__ == "__main__":
    # Create a dummy file for testing if one doesn't exist
    if not os.path.exists(input_file_path) and input_file_path == "YOUR_INPUT_FILE.docx":
        print("Please edit the script and put your actual file path in 'input_file_path'.")
    else:
        format_document_to_a5(input_file_path, output_file_path)