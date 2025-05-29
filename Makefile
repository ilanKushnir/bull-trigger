bootstrap:
	npm install --workspaces --include-workspace-root

up:
	docker compose -f compose.dev.yml up

prod-up:
	docker compose -f compose.prod.yml up -d 