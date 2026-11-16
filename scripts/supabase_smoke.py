"""Live local-API smoke checks after Supabase copy; output never includes PDF/chat content.

Args: --config PATH required, --ask optional to invoke one real Tutor/provider request.
Input: authorized private internal token; documented local demo accounts and copied data.
Output: JSON HTTP/status/count fields. Exit 0 pass / 1 sanitized failure.
Side effects: login sessions, and one conversation turn if --ask; no new upload/Quiz/enrollment.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from uuid import uuid4

import httpx
from dotenv import dotenv_values


def report(stage: str, **fields: str | int) -> None:
    """Args: safe stage/aggregate fields. Returns: None; prints flushed JSON only."""
    print(json.dumps({"stage": stage, **fields}), flush=True)


def login(client: httpx.Client, identifier: str) -> dict[str, str]:
    """Args: session client and documented demo identifier. Returns: safe /me profile.
    Raises: RuntimeError on status/role errors; no provider response bodies are printed.
    Side effect: one authenticated demo session.
    """
    response = client.post(
        "/auth/login", json={"identifier": identifier, "password": "StudyFlow@123"}
    )
    if response.status_code != 204:
        raise RuntimeError("Demo login failed")
    profile = client.get("/me")
    profile.raise_for_status()
    return profile.json()


def run(config_path: Path, ask: bool) -> None:
    """Args: private config, optional real Tutor check. Returns: None on pass.
    Raises: HTTP/input/assertion errors; caller suppresses raw values. See module side effects.
    """
    values = dotenv_values(config_path, interpolate=False, encoding="utf-8-sig")
    headers = {
        "Authorization": "Bearer " + str(values["INTERNAL_SERVICE_TOKEN"]),
        "X-Request-Id": str(uuid4()),
        "X-Schema-Version": "5",
    }
    ai = httpx.get(
        "http://127.0.0.1:8001/internal/v1/health", headers=headers, timeout=10
    )
    ai.raise_for_status()
    if ai.json()["readiness"] != "READY":
        raise RuntimeError("AI configuration is not ready")
    report("ai_health", http=ai.status_code, readiness="READY")
    base = "http://127.0.0.1:8088/api/v1"
    for prefix, letters in (("teacher", "abcdefg"), ("student", "abcdefghij")):
        for letter in letters:
            with httpx.Client(base_url=base, timeout=30) as client:
                suffix = "@ptit.edu.vn" if prefix == "teacher" else "@stu.ptit.edu.vn"
                profile = login(client, prefix + "." + letter + suffix)
                if profile["role"] != prefix.upper():
                    raise RuntimeError("Wrong account role")
                if profile["username"] != profile["email"]:
                    raise RuntimeError("Account username is not the full email")
    with httpx.Client(base_url=base, timeout=30) as admin:
        if login(admin, "admin.local")["role"] != "ADMIN":
            raise RuntimeError("Wrong Admin role")
    report("demo_accounts", teachers=7, students=10, admins=1)
    with httpx.Client(base_url=base, timeout=90) as teacher:
        login(teacher, "teacher.c@ptit.edu.vn")
        subject = teacher.get("/teacher/subject")
        subject.raise_for_status()
        if subject.json()["code"] != "KTS":
            raise RuntimeError("Teacher subject changed")
        docs = teacher.get("/teacher/documents?size=100")
        docs.raise_for_status()
        documents = docs.json()["items"]
        pdf_count = 0
        for document in documents:
            if document.get("status") != "READY":
                continue
            pdf = teacher.get(f"/teacher/documents/{document['id']}/download")
            if pdf.status_code != 200 or not pdf.content.startswith(b"%PDF-"):
                raise RuntimeError("Teacher PDF download failed")
            pdf_count += 1
        report("teacher_library", documents=len(documents), pdfs_verified=pdf_count)
    with httpx.Client(base_url=base, timeout=160) as student:
        login(student, "student.local@stu.ptit.edu.vn")
        materials = student.get("/student/materials?size=100")
        materials.raise_for_status()
        slides = [
            item
            for item in materials.json()["items"]
            if item.get("materialType") == "SLIDE_PDF"
        ]
        if not slides:
            raise RuntimeError(
                "No published slide available to original enrolled Student"
            )
        slide = next(
            (
                item
                for item in slides
                if "02" in str(item.get("title", ""))
                or "Chương 2" in str(item.get("title", ""))
            ),
            slides[0],
        )
        document_id = slide.get("documentId", slide.get("id"))
        image = student.get(f"/student/materials/{document_id}/slides/1")
        if image.status_code != 200 or not image.content.startswith(b"\x89PNG"):
            raise RuntimeError("Student slide rendering failed")
        note = student.get(f"/student/materials/{document_id}/pages/1/note")
        note.raise_for_status()
        history = student.get(f"/student/materials/{document_id}/tutor/history")
        history.raise_for_status()
        report(
            "student_viewer",
            png_http=image.status_code,
            note_http=note.status_code,
            history_http=history.status_code,
            published_slides=len(slides),
        )
        with httpx.Client(base_url=base, timeout=30) as outsider:
            login(outsider, "student.a@stu.ptit.edu.vn")
            denied = outsider.get(f"/student/materials/{document_id}/slides/1")
            if denied.status_code not in (403, 404):
                raise RuntimeError("Unenrolled Student was not denied")
            report("unenrolled_access", http=denied.status_code)
        if ask:
            answer = student.post(
                f"/student/materials/{document_id}/pages/1/tutor",
                json={
                    "question": "Giải thích nguyên lý hoạt động của cổng AND và OR dựa trên tài liệu."
                },
            )
            answer.raise_for_status()
            payload = answer.json()
            if payload["status"] not in ("ANSWERED", "NO_EVIDENCE"):
                raise RuntimeError("Invalid Tutor response")
            report(
                "tutor_live",
                http=answer.status_code,
                status=payload["status"],
                citations=len(payload["citations"]),
            )
    web = httpx.get("http://127.0.0.1:3000/login", timeout=30)
    web.raise_for_status()
    report("web_login", http=web.status_code)


def main() -> int:
    """Args: CLI config/ask. Returns: sanitized exit 0/1, no raw errors or response content."""
    parser = argparse.ArgumentParser(
        description="Live Supabase-backed application smoke checks"
    )
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--ask", action="store_true")
    args = parser.parse_args()
    try:
        run(args.config, args.ask)
        return 0
    except Exception as error:  # noqa: BLE001 - suppress signed URLs, PDF content and chat provider errors.
        status = (
            error.response.status_code
            if isinstance(error, httpx.HTTPStatusError)
            else 0
        )
        report("FAILED", error_type=type(error).__name__, http=status)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
