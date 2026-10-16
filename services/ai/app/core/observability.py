"""Bounded request metrics and safe trace propagation without logging user content."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from threading import Lock
from time import perf_counter

from fastapi import FastAPI, Request, Response
from fastapi.routing import APIRoute

from app.core.request_id import safe_request_id


@dataclass(frozen=True)
class MetricSample:
    """Aggregate for one known route/status pair, never a user or document identifier."""

    route: str
    status_code: int
    count: int
    total_milliseconds: float
    max_milliseconds: float


class RequestMetrics:
    """In-process bounded counters; no prompts, PDFs, query strings or service keys."""

    def __init__(self) -> None:
        """Args: none. Returns: None; creates empty counters. Raises: none."""
        self._lock = Lock()
        self._samples: dict[tuple[str, int], MetricSample] = {}

    def record(self, *, route: str, status_code: int, milliseconds: float) -> None:
        """Add one measurement.

        Args: route: fixed route template; status_code: response status; milliseconds: latency.
        Returns: None; mutates bounded aggregate counters.
        Raises: ValueError for invalid measurements.
        """
        if not route or not 100 <= status_code <= 599 or milliseconds < 0:
            raise ValueError("invalid request metric")
        with self._lock:
            prior = self._samples.get((route, status_code))
            self._samples[(route, status_code)] = MetricSample(
                route=route,
                status_code=status_code,
                count=(prior.count if prior else 0) + 1,
                total_milliseconds=(prior.total_milliseconds if prior else 0) + milliseconds,
                max_milliseconds=max(prior.max_milliseconds if prior else 0, milliseconds),
            )

    def snapshot(self) -> tuple[MetricSample, ...]:
        """Args: none. Returns: immutable aggregate snapshot. Raises: none."""
        with self._lock:
            return tuple(self._samples.values())


def install_observability(application: FastAPI) -> None:
    """Register bounded metrics and sanitized X-Request-Id response propagation.

    Args: application: service FastAPI instance.
    Returns: None; installs middleware and application.state.request_metrics.
    Raises: None. Does not create a new public/internal API endpoint.
    """
    metrics = RequestMetrics()
    application.state.request_metrics = metrics

    @application.middleware("http")
    async def trace_request(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Measure fixed routes only.

        Args: request: incoming HTTP request; call_next: ASGI response dispatcher.
        Returns: Response with safe trace header where valid; records latency/status.
        Raises: Re-raises unhandled application exceptions after recording status 500.
        """
        started = perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            request_id = safe_request_id(request.headers.get("X-Request-Id"))
            if request_id is not None:
                response.headers["X-Request-Id"] = request_id
            return response
        finally:
            route = request.scope.get("route")
            metrics.record(
                route=route.path if isinstance(route, APIRoute) else "UNMATCHED",
                status_code=status_code,
                milliseconds=(perf_counter() - started) * 1000,
            )
