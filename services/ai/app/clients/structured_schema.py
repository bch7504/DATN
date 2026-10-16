"""Convert Pydantic output schemas to closed provider JSON schemas."""

from copy import deepcopy

from pydantic import BaseModel, JsonValue


def provider_schema(model: type[BaseModel]) -> dict[str, JsonValue]:
    """Close every object and normalize homogeneous tuples for provider output.

    Args:
        model: Typed output model; fixed tuple members must share a schema.
    Returns:
        Detached JSON schema with all object keys required, including nullable ones.
    Raises:
        ValueError: If a heterogeneous tuple cannot be represented as an array.
    """
    schema = deepcopy(model.model_json_schema())
    _normalize(schema)
    return schema


def _normalize(node: JsonValue) -> None:
    """Normalize JSON tree in place. Args: node. Returns: None. Raises: ValueError for tuples."""
    if isinstance(node, list):
        for value in node:
            _normalize(value)
    elif isinstance(node, dict):
        node.pop("default", None)
        properties = node.get("properties")
        if isinstance(properties, dict):
            node["additionalProperties"] = False
            node["required"] = list(properties)
        members = node.pop("prefixItems", None)
        if isinstance(members, list) and members:
            if any(member != members[0] for member in members):
                raise ValueError("heterogeneous provider tuples are not supported")
            node["items"] = members[0]
        for value in node.values():
            _normalize(value)
