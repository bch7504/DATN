# Typed AI schemas

`api.py`/`jobs.py` định nghĩa request/response nội bộ v3, `grounding.py` định nghĩa document scope, evidence, citation và Quiz đúng 4 options, `orchestration.py` định nghĩa tool routing/history/result.

Wire schema dùng camelCase; domain field Python dùng snake_case. PDF pipeline có kiểu riêng cho pages/chunks/artifact. Không để model trả owner, quyền truy cập hoặc source scope mới; các field này do Java và repository quyết định.
