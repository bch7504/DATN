"""Render six BE2 report diagrams from their current PlantUML sources.

Args: one required CLI argument, the external PlantUML dependency prefix.
Input: six ``class-/sequence-be2-*.puml`` files next to this script.
Output: six SVG files and six PNG files, overwriting only generated images.
Errors: missing prefix or renderer failure exits nonzero; no partial success is hidden.
"""

from __future__ import annotations

from html import escape
from pathlib import Path
from typing import Literal

OUT = Path(__file__).resolve().parent
Box = tuple[int, int, int, str, str, list[str]]
Message = tuple[int, int, str, Literal["call", "return", "async"]]
Frame = tuple[int, int, str]


def txt(value: str) -> str:
    """Args: arbitrary label. Input: Unicode diagram text. Output: XML-safe text. Errors: none."""
    return escape(value, quote=True)


def write_svg(name: str, svg: str) -> None:
    """Args: output stem and SVG markup. Input: generated diagram. Output: SVG/PNG files. Errors: I/O or CairoSVG failure."""
    import cairosvg

    svg_path = OUT / f"{name}.svg"
    png_path = OUT / f"{name}.png"
    svg_path.write_text(svg, encoding="utf-8")
    cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=str(png_path), output_width=2400)


def class_svg(title: str, boxes: list[Box], edges: list[tuple[int, int]], note: str) -> str:
    """Args: title, positioned UML boxes, edge indexes, note. Input: fixed report model. Output: SVG string. Errors: IndexError for invalid edge."""
    width = 1800
    height = max(y + 100 + 34 * len(lines) for _, y, _, _, _, lines in boxes) + 120
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<defs><marker id="arrow" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto"><path d="M0 0 L11 4.5 L0 9 Z" fill="#252525"/></marker></defs>',
        '<rect width="100%" height="100%" fill="white"/>',
        f'<text x="45" y="51" font-family="Arial,sans-serif" font-size="34" font-weight="700">{txt(title)}</text>',
    ]
    for source, target in edges:
        sx, sy, sw, _, _, sl = boxes[source]
        tx, ty, tw, _, _, _ = boxes[target]
        sh = 100 + 34 * len(sl)
        if abs(sy - ty) < 60:
            if sx < tx:
                x1, y1, x2, y2 = sx + sw, sy + sh / 2, tx, ty + 90
            else:
                x1, y1, x2, y2 = sx, sy + sh / 2, tx + tw, ty + 90
        else:
            x1, y1, x2, y2 = sx + sw / 2, sy + sh, tx + tw / 2, ty
        out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#252525" stroke-width="2.5" marker-end="url(#arrow)"/>')
    for x, y, w, stereotype, name, lines in boxes:
        h = 100 + 34 * len(lines)
        out.extend([
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#8fcfeb" stroke="#252525" stroke-width="2.5"/>',
            f'<line x1="{x}" y1="{y+82}" x2="{x+w}" y2="{y+82}" stroke="#252525" stroke-width="2"/>',
            f'<text x="{x+w/2}" y="{y+29}" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-style="italic">«{txt(stereotype)}»</text>',
            f'<text x="{x+w/2}" y="{y+64}" text-anchor="middle" font-family="Arial,sans-serif" font-size="29" font-weight="700">{txt(name)}</text>',
        ])
        for i, line in enumerate(lines):
            out.append(f'<text x="{x+17}" y="{y+117+i*34}" font-family="Arial,sans-serif" font-size="25">{txt(line)}</text>')
    out.append(f'<text x="45" y="{height-28}" font-family="Arial,sans-serif" font-size="24" font-style="italic">{txt(note)}</text>')
    out.append('</svg>')
    return "".join(out)


def sequence_svg(title: str, lanes: list[str], messages: list[Message], frames: list[Frame], note: str) -> str:
    """Args: title, participant labels, ordered messages, UML frames, note. Input: fixed flow. Output: SVG string. Errors: IndexError for invalid lane."""
    width = 1800
    left, right = 120, 1680
    xs = [left + i * (right - left) / (len(lanes) - 1) for i in range(len(lanes))]
    top, row = 225, 80
    height = top + row * len(messages) + 135
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<defs><marker id="arrow" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto"><path d="M0 0 L11 4.5 L0 9 Z" fill="#222"/></marker></defs>',
        '<rect width="100%" height="100%" fill="white"/>',
        f'<rect x="12" y="18" width="1776" height="{height-35}" fill="none" stroke="#222" stroke-width="2.5"/>',
        f'<path d="M12 18 H{min(900,110+len(title)*21)} L{min(870,80+len(title)*21)} 70 H12 Z" fill="white" stroke="#222" stroke-width="2.5"/>',
        f'<text x="28" y="54" font-family="Arial,sans-serif" font-size="31">sd {txt(title)}</text>',
    ]
    for x, lane in zip(xs, lanes):
        out.extend([
            f'<rect x="{x-115}" y="111" width="230" height="58" rx="4" fill="#8fcfeb" stroke="#555" stroke-width="1.8"/>',
            f'<text x="{x}" y="148" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="700">{txt(lane)}</text>',
            f'<line x1="{x}" y1="169" x2="{x}" y2="{height-90}" stroke="#999" stroke-width="2" stroke-dasharray="9 10"/>',
        ])
    for first, last, label in frames:
        y = top + first * row - 65
        h = (last - first) * row + 125
        out.extend([
            f'<rect x="35" y="{y}" width="1730" height="{h}" fill="#f7fbfd" fill-opacity="0.5" stroke="#555" stroke-width="2"/>',
            f'<path d="M35 {y} H{min(800,90+len(label)*18)} L{min(770,65+len(label)*18)} {y+38} H35 Z" fill="white" stroke="#555" stroke-width="2"/>',
            f'<text x="50" y="{y+27}" font-family="Arial,sans-serif" font-size="23" font-weight="700">{txt(label)}</text>',
        ])
    for i, (src, dst, label, kind) in enumerate(messages):
        x1, x2, y = xs[src], xs[dst], top + i * row
        if src == dst:
            out.append(f'<path d="M{x1} {y} h80 v35 h-80" fill="none" stroke="#222" stroke-width="2.4" marker-end="url(#arrow)"/>')
        else:
            dash = ' stroke-dasharray="8 6"' if kind == "return" else ""
            out.append(f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#222" stroke-width="2.4"{dash} marker-end="url(#arrow)"/>')
        out.append(f'<text x="{(x1+x2)/2}" y="{y-13}" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" fill="#111">{i+1}. {txt(label)}</text>')
    out.append(f'<text x="45" y="{height-52}" font-family="Arial,sans-serif" font-size="23" font-style="italic">{txt(note)}</text>')
    out.append('</svg>')
    return "".join(out)


def main() -> None:
    """Args: none. Input: fixed BE2 definitions. Output: 12 diagram assets. Errors: conversion/I/O aborts the command."""
    class_specs: list[tuple[str, str, list[Box], list[tuple[int, int]], str]] = [
        (
            "class-be2-f01-assignment", "BE2-F01 — Bài tập và bài nộp",
            [
                (35, 90, 530, "giao diện", "TeacherAssignmentController", ["+tạo bản nháp()", "+công bố()", "+xem thống kê(), chấm bài()"]),
                (640, 90, 530, "xử lý", "AssignmentService", ["+tạo / công bố bài tập()", "+nộp hoặc thay bài hiện tại()", "+thống kê / chấm bài()"]),
                (1245, 90, 530, "giao diện", "StudentAssignmentController", ["+xem bài tập()", "+nộp văn bản hoặc tệp()"]),
                (35, 455, 530, "dữ liệu", "CourseAssignment", ["-lớp, giảng viên, hạn nộp", "-trạng thái: DRAFT / PUBLISHED"]),
                (640, 455, 530, "dữ liệu", "AssignmentSubmission", ["-bài tập, sinh viên, giờ nộp", "-đúng hạn / muộn, điểm, nhận xét", "-mỗi sinh viên chỉ có 1 bản hiện tại"]),
                (1245, 455, 530, "dữ liệu", "AssignmentSubmissionAttachment", ["-bài nộp, tên tệp, khóa lưu trữ", "-nộp lại thì thay tệp cũ"]),
                (640, 800, 530, "tác vụ", "AssignmentReminderJob", ["+kiểm tra bài sắp đến hạn()", "+tạo nhắc hạn()"]),
            ],
            [(0, 1), (2, 1), (1, 3), (1, 4), (1, 5), (6, 1), (4, 5)],
            "Lớp và quyền tham gia được kiểm tra trước khi giao, xem hoặc nộp bài.",
        ),
        (
            "class-be2-f02-material", "BE2-F02 — Kho học liệu PDF",
            [
                (35, 90, 530, "giao diện", "TeacherCourseMaterialController", ["+tải PDF vào kho()", "+công bố / thu hồi()"]),
                (640, 90, 530, "xử lý", "CourseMaterialLibraryService", ["+kiểm tra PDF có lớp văn bản()", "+lưu tài liệu Sẵn sàng()", "+kiểm tra lớp và quyền truy cập()"]),
                (1245, 90, 530, "giao diện", "StudentCourseMaterialController", ["+xem danh sách tài liệu()", "+xem / tải PDF()"]),
                (340, 430, 530, "dữ liệu", "CourseMaterialDocument", ["-chủ sở hữu, tên tệp, số trang", "-loại PDF; trạng thái READY"]),
                (945, 430, 530, "dữ liệu", "DocumentPublication", ["-tài liệu, lớp học phần", "-PUBLISHED / REVOKED"]),
            ],
            [(0, 1), (2, 1), (1, 3), (1, 4), (3, 4)],
            "Tài liệu vẫn trong kho sau khi thu hồi khỏi lớp; Sinh viên phải được duyệt vào lớp.",
        ),
        (
            "class-be2-f03-study-plan", "BE2-F03 — Kế hoạch và lịch học cá nhân",
            [
                (35, 90, 530, "giao diện", "StudyPlanController", ["+tạo / sửa đầu việc()", "+hoàn thành / hủy / ẩn()", "+xem lịch tuần()"]),
                (640, 90, 530, "xử lý", "StudyPlanService", ["+kiểm tra chủ sở hữu / lớp()", "+lưu và đổi trạng thái()", "+dựng lịch từ đầu việc()"]),
                (1245, 90, 530, "tác vụ", "StudyDeadlineReminderJob", ["+quét đầu việc Cần làm()", "+gửi nhắc trước hạn()"]),
                (35, 455, 530, "dữ liệu", "StudyPlan", ["-sinh viên, tên kế hoạch", "-ngày bắt đầu / kết thúc"]),
                (640, 455, 530, "dữ liệu", "StudyPlanItem", ["-kế hoạch, lớp tùy chọn, hạn", "-TODO / COMPLETED / CANCELLED", "-DELETED (ẩn), thời điểm hoàn thành"]),
                (1245, 455, 530, "hiển thị", "StudyPlanItemResponse", ["+tính Quá hạn khi xem lịch()", "+không lưu OVERDUE vào dữ liệu"]),
            ],
            [(0, 1), (2, 1), (1, 3), (1, 4), (1, 5), (3, 4), (4, 5)],
            "Ẩn khỏi lịch không xóa lịch sử; lớp gắn với đầu việc phải có ghi danh được duyệt.",
        ),
    ]
    for filename, title, boxes, edges, note in class_specs:
        write_svg(filename, class_svg(title, boxes, edges, note))

    sequence_specs: list[tuple[str, str, list[str], list[Message], list[Frame], str]] = [
        (
            "sequence-be2-f01-assignment", "BE2-F01 — Giao, nộp và chấm bài",
            ["Giảng viên", "Giao diện", "Hệ thống", "Dữ liệu", "Thông báo", "Sinh viên"],
            [
                (0, 1, "Nhập tiêu đề, hướng dẫn, hạn", "call"),
                (1, 2, "Tạo bản nháp trong lớp", "call"),
                (2, 3, "Kiểm tra lớp; lưu DRAFT", "call"),
                (0, 1, "Chọn công bố bài tập", "call"),
                (1, 2, "Công bố cho lớp", "call"),
                (2, 3, "Lưu PUBLISHED", "call"),
                (2, 4, "Tạo thông báo bài mới", "async"),
                (4, 5, "Gửi cho sinh viên đã duyệt", "async"),
                (5, 1, "Nộp văn bản hoặc tệp", "call"),
                (1, 2, "Gửi bài nộp", "call"),
                (2, 3, "Lưu bản hiện tại; thay tệp cũ", "call"),
                (3, 1, "Trả đúng hạn hoặc nộp muộn", "return"),
                (2, 4, "Gần hạn: nhắc người chưa nộp", "async"),
                (4, 5, "Thông báo nhắc hạn", "async"),
                (0, 1, "Xem số lượng và danh sách", "call"),
                (1, 2, "Yêu cầu thống kê bài nộp", "call"),
                (2, 3, "Đối chiếu lớp và bài nộp", "call"),
                (0, 1, "Nhập điểm, nhận xét", "call"),
                (1, 2, "Lưu kết quả chấm", "call"),
                (2, 3, "Cập nhật bài nộp hiện tại", "call"),
            ],
            [(8, 11, "alt  Nộp lần đầu hoặc nộp lại"), (12, 13, "opt  Khi gần đến hạn")],
            "Bài nộp chỉ giữ bản mới nhất; thông báo chấm bài là yêu cầu còn cần triển khai.",
        ),
        (
            "sequence-be2-f02-material", "BE2-F02 — Kho và công bố PDF",
            ["Giảng viên", "Giao diện", "Hệ thống", "Kho tệp", "Dữ liệu", "Sinh viên"],
            [
                (0, 1, "Chọn PDF có lớp văn bản", "call"),
                (1, 2, "Đưa tài liệu vào kho", "call"),
                (2, 2, "Kiểm tra loại, cỡ và văn bản", "call"),
                (2, 3, "Lưu PDF hợp lệ", "call"),
                (2, 4, "Lưu tài liệu READY", "call"),
                (4, 1, "Hiển thị trong kho học liệu", "return"),
                (0, 1, "Chọn tài liệu và lớp", "call"),
                (1, 2, "Yêu cầu công bố", "call"),
                (2, 4, "Kiểm tra chủ lớp; lưu PUBLISHED", "call"),
                (5, 1, "Mở học liệu của lớp", "call"),
                (1, 2, "Yêu cầu xem hoặc tải PDF", "call"),
                (2, 4, "Kiểm tra duyệt lớp và công bố", "call"),
                (2, 3, "Đọc tệp PDF được phép", "call"),
                (3, 5, "Xem trên web hoặc tải về", "return"),
                (0, 1, "Chọn thu hồi khỏi lớp", "call"),
                (1, 2, "Yêu cầu thu hồi", "call"),
                (2, 4, "Lưu REVOKED; giữ tệp trong kho", "call"),
            ],
            [(2, 5, "alt  PDF hợp lệ; tệp lỗi bị từ chối"), (9, 13, "alt  Chỉ sinh viên được duyệt")],
            "Không nhận PPTX/DOCX hoặc PDF quét thiếu lớp văn bản trong phạm vi này.",
        ),
        (
            "sequence-be2-f03-study-plan", "BE2-F03 — Kế hoạch và lịch cá nhân",
            ["Sinh viên", "Giao diện", "Hệ thống", "Dữ liệu", "Nhắc lịch"],
            [
                (0, 1, "Mở lịch tuần", "call"),
                (1, 2, "Lấy đầu việc của mình", "call"),
                (2, 3, "Đọc dữ liệu; tính Quá hạn", "call"),
                (3, 1, "Hiển thị lịch và trạng thái", "return"),
                (0, 1, "Tạo đầu việc, hạn, mốc nhắc", "call"),
                (1, 2, "Gửi yêu cầu tạo", "call"),
                (2, 3, "Kiểm tra lớp được duyệt; lưu TODO", "call"),
                (3, 1, "Hiển thị đầu việc mới", "return"),
                (4, 2, "Quét đầu việc Cần làm gần hạn", "call"),
                (2, 3, "Chặn nhắc trùng; ghi thông báo", "call"),
                (4, 0, "Gửi nhắc hạn", "async"),
                (0, 1, "Sửa, đổi lịch hoặc hủy", "call"),
                (1, 2, "Lưu thay đổi của chủ sở hữu", "call"),
                (2, 3, "Cập nhật lịch / CANCELLED", "call"),
                (0, 1, "Đánh dấu Đã hoàn thành", "call"),
                (1, 2, "Gửi yêu cầu hoàn thành", "call"),
                (2, 3, "Lưu COMPLETED, thời điểm, 1 sự kiện", "call"),
                (0, 1, "Ẩn đầu việc khỏi lịch", "call"),
                (1, 2, "Yêu cầu ẩn", "call"),
                (2, 3, "Lưu DELETED, giữ lịch sử", "call"),
            ],
            [(4, 7, "alt  Lớp tùy chọn; nếu có phải được duyệt"), (14, 16, "opt  Hoàn thành chỉ ghi một lần")],
            "Quá hạn chỉ được tính khi hiển thị; hệ thống không tự hoàn thành đầu việc.",
        ),
    ]
    for filename, title, lanes, messages, frames, note in sequence_specs:
        write_svg(filename, sequence_svg(title, lanes, messages, frames, note))


if __name__ == "__main__":
    from subprocess import run
    from sys import argv

    if len(argv) != 2:
        raise SystemExit("Usage: python render_be2_report_diagrams.py <dependency-prefix>")
    renderer = OUT.parent / "render-plantuml.mjs"
    stems = (
        "class-be2-f01-assignment",
        "sequence-be2-f01-assignment",
        "class-be2-f02-material",
        "sequence-be2-f02-material",
        "class-be2-f03-study-plan",
        "sequence-be2-f03-study-plan",
    )
    for stem in stems:
        run(["node", str(renderer), argv[1], f"chuong-3/{stem}"], check=True)
