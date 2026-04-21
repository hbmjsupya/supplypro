group "default" {
  targets = ["supplypro-backend", "frontend"]
}

target "supplypro-backend" {
  context = "backend"
  dockerfile = "Dockerfile"
  tags = ["supplypro-backend:latest"]
  cache-from = ["type=registry,ref=localhost:5000/supplypro-backend:cache"]
  cache-to = ["type=registry,ref=localhost:5000/supplypro-backend:cache,mode=max"]
}

target "frontend" {
  context = "frontend"
  dockerfile = "Dockerfile"
  tags = ["supplypro-frontend:latest"]
  cache-from = ["type=registry,ref=localhost:5000/supplypro-frontend:cache"]
  cache-to = ["type=registry,ref=localhost:5000/supplypro-frontend:cache,mode=max"]
}
