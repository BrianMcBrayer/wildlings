from pathlib import Path


def test_docker_compose_has_healthcheck() -> None:
    compose_path = Path(__file__).resolve().parents[2] / "docker-compose.yml"
    contents = compose_path.read_text(encoding="utf-8")

    assert "healthcheck:" in contents
    assert "sync/pull" in contents
    assert "X-Internal-Token" in contents
