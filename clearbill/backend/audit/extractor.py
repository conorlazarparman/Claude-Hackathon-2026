import anthropic
import base64
import json
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Top common CPT codes injected as cached context to help Claude recognize them
CMS_HINT = """Common medical billing CPT codes for reference:
99213=Office visit, established patient, low complexity
99214=Office visit, established patient, moderate complexity
99215=Office visit, established patient, high complexity
99283=Emergency dept visit, moderate severity
99284=Emergency dept visit, high severity
99285=Emergency dept visit, high severity with threat to life
93000=Electrocardiogram, routine, with interpretation
71046=Chest X-ray, 2 views
80053=Comprehensive metabolic panel
85025=Complete blood count with differential
36415=Collection of venous blood by venipuncture
99232=Subsequent hospital care, per day
99233=Subsequent hospital care, per day, high complexity
27447=Total knee arthroplasty
27130=Total hip arthroplasty
43239=Upper GI endoscopy with biopsy
45378=Colonoscopy, diagnostic
70553=MRI brain with and without contrast
74177=CT abdomen and pelvis with contrast
70450=CT head/brain without contrast"""


async def extract_bill(file_bytes: bytes, content_type: str) -> dict:
    """Claude Vision extracts every line item from a medical bill."""
    b64 = base64.standard_b64encode(file_bytes).decode("utf-8")

    media_type_map = {
        "application/pdf": "application/pdf",
        "image/jpeg": "image/jpeg",
        "image/png": "image/png",
        "image/webp": "image/webp",
        "image/gif": "image/gif",
    }
    media_type = media_type_map.get(content_type, "image/jpeg")
    is_pdf = media_type == "application/pdf"

    content_block = {
        "type": "document" if is_pdf else "image",
        "source": {
            "type": "base64",
            "media_type": media_type,
            "data": b64,
        },
    }
    if is_pdf:
        content_block["cache_control"] = {"type": "ephemeral"}

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=[
            {
                "type": "text",
                "text": f"You are a medical billing expert. {CMS_HINT}",
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": [
                    content_block,
                    {
                        "type": "text",
                        "text": """Extract every line item from this medical bill.
Return ONLY valid JSON, no markdown fences, no other text:
{
  "patient_name": "...",
  "hospital_name": "...",
  "hospital_npi": "...",
  "account_number": "...",
  "service_date": "...",
  "line_items": [
    {
      "id": "1",
      "description": "exact text from bill",
      "cpt_code_raw": "code if shown, else null",
      "quantity": 1,
      "billed_amount": 0.00,
      "insurance_adjustment": 0.00,
      "patient_owes": 0.00
    }
  ],
  "total_billed": 0.00,
  "total_patient_owes": 0.00
}""",
                    },
                ],
            }
        ],
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
