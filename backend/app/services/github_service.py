import httpx
import base64
import re
import os

def parse_github_url(url: str) -> dict:
    # Handle both formats:
    # https://github.com/user/repo/blob/main/file.py
    # https://raw.githubusercontent.com/user/repo/main/file.py
    
    raw_pattern = r"https://raw\.githubusercontent\.com/([^/]+)/([^/]+)/([^/]+)/(.+)"
    blob_pattern = r"https://github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)"

    raw_match = re.match(raw_pattern, url)
    blob_match = re.match(blob_pattern, url)

    if raw_match:
        owner, repo, branch, path = raw_match.groups()
        return {"owner": owner, "repo": repo, "branch": branch, "path": path}
    elif blob_match:
        owner, repo, branch, path = blob_match.groups()
        return {"owner": owner, "repo": repo, "branch": branch, "path": path}
    else:
        raise ValueError("Invalid GitHub URL format")

def detect_language(filename: str) -> str:
    ext_map = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".jsx": "javascript",
        ".tsx": "typescript",
        ".java": "java",
        ".cpp": "cpp",
        ".c": "c",
        ".go": "go",
        ".rs": "rust",
        ".rb": "ruby",
        ".php": "php",
    }
    ext = "." + filename.split(".")[-1].lower()
    return ext_map.get(ext, "plaintext")

async def fetch_github_file(url: str) -> dict:
    parsed = parse_github_url(url)
    
    # Use GitHub API
    api_url = f"https://api.github.com/repos/{parsed['owner']}/{parsed['repo']}/contents/{parsed['path']}?ref={parsed['branch']}"
    
    headers = {"Accept": "application/vnd.github.v3+json"}
    
    # Add token if available for higher rate limits
    github_token = os.getenv("GITHUB_TOKEN")
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    async with httpx.AsyncClient() as client:
        response = await client.get(api_url, headers=headers)

        if response.status_code == 404:
            raise ValueError("File not found. Make sure the URL is correct and the repo is public.")
        elif response.status_code == 403:
            raise ValueError("GitHub rate limit exceeded. Try again later.")
        elif response.status_code != 200:
            raise ValueError(f"GitHub API error: {response.status_code}")

        data = response.json()

        if data.get("type") != "file":
            raise ValueError("URL must point to a file, not a directory.")

        # Decode base64 content
        content = base64.b64decode(data["content"]).decode("utf-8")
        language = detect_language(data["name"])

        return {
            "code": content,
            "language": language,
            "filename": data["name"],
            "size": data["size"]
        }