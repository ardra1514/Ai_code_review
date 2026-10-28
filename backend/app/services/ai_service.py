from google import genai
import json
import os

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_ai_review(code: str, language: str, static_issues: list) -> dict:
    static_context = ""
    if static_issues:
        static_context = f"\nStatic analysis already found these issues:\n{json.dumps(static_issues, indent=2)}\nDo not repeat these."

    prompt = f"""You are a senior software engineer doing a code review.
Review this {language} code and respond ONLY with a valid JSON object, no markdown, no extra text.
{static_context}

Code:
```{language}
{code}
```

Respond with exactly this structure:
{{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "issues": [
    {{
      "line": <line number or 0 if general>,
      "severity": "<critical|warning|suggestion>",
      "message": "<clear description of the issue>",
      "fix": "<concrete fix with example if possible>"
    }}
  ]
}}"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    raw = response.text.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)