def test_health_endpoint(client):
    """Verify health endpoint returns status 200 and expected schema."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "edna-explorer-api"
    assert "version" in data


def test_root_endpoint(client):
    """Verify root endpoint provides discoverability."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "documentation" in data
    assert "health_check" in data
