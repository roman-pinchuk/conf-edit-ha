.PHONY: help build build-frontend build-docker run stop clean test

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
NC     := \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)Configuration Editor - Build Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

build: build-frontend build-docker ## Build frontend and Docker image

build-frontend: ## Build frontend assets
	@echo "$(GREEN)Building frontend...$(NC)"
	cd frontend && npm install && npm run build

build-docker: ## Build Docker image
	@echo "$(GREEN)Building Docker image...$(NC)"
	docker build -t conf-edit-ha .

run: ## Run Docker container locally
	@echo "$(GREEN)Starting container...$(NC)"
	docker run -d --name conf-edit-test -p 8099:8099 -v "$$(pwd)/test-config:/config" conf-edit-ha
	@echo "$(GREEN)Container started! Open http://localhost:8099$(NC)"

stop: ## Stop and remove Docker container
	@echo "$(YELLOW)Stopping container...$(NC)"
	-docker stop conf-edit-test
	-docker rm conf-edit-test

restart: stop build run ## Rebuild and restart container

clean: stop ## Clean build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf static
	docker rmi -f conf-edit-ha

test: ## Run test container with test config
	@echo "$(GREEN)Running test container...$(NC)"
	$(MAKE) stop
	$(MAKE) build
	$(MAKE) run
	@echo "$(GREEN)Test container running at http://localhost:8099$(NC)"

logs: ## Show container logs
	docker logs -f conf-edit-test

dev-frontend: ## Run frontend in development mode
	cd frontend && npm run dev

# Multi-arch builds (requires buildx)
build-multiarch: build-frontend ## Build for multiple architectures
	@echo "$(GREEN)Building multi-arch image...$(NC)"
	docker buildx create --name ha-builder --use || true
	docker buildx build \
		--platform linux/amd64,linux/arm64,linux/arm/v7 \
		-t conf-edit-ha:multiarch \
		.

inspect: ## Inspect the Docker image
	docker images conf-edit-ha
	docker inspect conf-edit-ha | head -50

deploy-ha: build-frontend ## Deploy to Home Assistant instance
	@echo "$(GREEN)Deploying to Home Assistant...$(NC)"
	@./deploy-to-ha.sh

publish: build-frontend ## Publish to GitHub repository
	@echo "$(GREEN)Publishing to GitHub...$(NC)"
	@./publish-to-github.sh
