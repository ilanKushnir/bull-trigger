bootstrap:
	npm install --workspaces --include-workspace-root

up:
	docker compose -f compose.dev.yml up

prod-up:
	docker compose -f compose.prod.yml up -d

logs:
	docker compose -f compose.dev.yml logs -f

down:
	docker compose -f compose.dev.yml down 