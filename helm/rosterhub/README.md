# RosterHub Helm Chart

This Helm chart deploys the RosterHub OneRoster API application on a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.25+
- Helm 3.8+
- PV provisioner support in the underlying infrastructure
- NGINX Ingress Controller
- cert-manager (for automatic TLS certificate management)

## Installation

### Quick Start

1. **Add the Helm repository** (if published):
```bash
helm repo add rosterhub https://charts.rosterhub.example.com
helm repo update
```

2. **Install the chart**:
```bash
# Development environment
helm install rosterhub rosterhub/rosterhub \
  --namespace rosterhub-dev \
  --create-namespace \
  --values values-dev.yaml \
  --set secrets.postgresPassword="$(openssl rand -base64 32)" \
  --set secrets.redisPassword="$(openssl rand -base64 32)" \
  --set secrets.jwtSecret="$(openssl rand -base64 32)"

# Production environment
helm install rosterhub rosterhub/rosterhub \
  --namespace rosterhub \
  --create-namespace \
  --values values-prod.yaml \
  --set secrets.postgresPassword="$(openssl rand -base64 32)" \
  --set secrets.redisPassword="$(openssl rand -base64 32)" \
  --set secrets.jwtSecret="$(openssl rand -base64 32)"
```

### Local Installation

If you have the chart locally:

```bash
# From the helm directory
cd helm/rosterhub

# Development
helm install rosterhub . \
  --namespace rosterhub-dev \
  --create-namespace \
  --values values-dev.yaml \
  --set secrets.postgresPassword="$(openssl rand -base64 32)" \
  --set secrets.redisPassword="$(openssl rand -base64 32)" \
  --set secrets.jwtSecret="$(openssl rand -base64 32)"

# Production
helm install rosterhub . \
  --namespace rosterhub \
  --create-namespace \
  --values values-prod.yaml \
  --set secrets.postgresPassword="$(openssl rand -base64 32)" \
  --set secrets.redisPassword="$(openssl rand -base64 32)" \
  --set secrets.jwtSecret="$(openssl rand -base64 32)"
```

## Configuration

### Required Configuration

The following values **must** be configured before deployment:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `secrets.postgresPassword` | PostgreSQL password | `""` (must be set) |
| `secrets.redisPassword` | Redis password | `""` (must be set) |
| `secrets.jwtSecret` | JWT signing secret | `""` (must be set) |

### Recommended Configuration for Production

| Parameter | Description | Default |
|-----------|-------------|---------|
| `api.ingress.hosts[0].host` | API hostname | `api.rosterhub.example.com` |
| `config.corsAllowedOrigins` | CORS allowed origins | `*` |
| `postgresql.persistence.storageClass` | Storage class for PostgreSQL | `standard` |
| `redis.persistence.storageClass` | Storage class for Redis | `standard` |

### Common Configuration Parameters

#### API Application

| Parameter | Description | Default |
|-----------|-------------|---------|
| `api.replicaCount` | Number of API replicas | `2` |
| `api.image.repository` | API container image repository | `rosterhub/api` |
| `api.image.tag` | API container image tag | `latest` |
| `api.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `api.resources.requests.memory` | Memory request | `256Mi` |
| `api.resources.requests.cpu` | CPU request | `100m` |
| `api.resources.limits.memory` | Memory limit | `512Mi` |
| `api.resources.limits.cpu` | CPU limit | `500m` |

#### Autoscaling

| Parameter | Description | Default |
|-----------|-------------|---------|
| `api.autoscaling.enabled` | Enable HPA | `true` |
| `api.autoscaling.minReplicas` | Minimum replicas | `2` |
| `api.autoscaling.maxReplicas` | Maximum replicas | `10` |
| `api.autoscaling.targetCPUUtilizationPercentage` | CPU target | `70` |
| `api.autoscaling.targetMemoryUtilizationPercentage` | Memory target | `80` |

#### PostgreSQL

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL StatefulSet | `true` |
| `postgresql.image.repository` | PostgreSQL image | `postgres` |
| `postgresql.image.tag` | PostgreSQL version | `15-alpine` |
| `postgresql.persistence.enabled` | Enable persistence | `true` |
| `postgresql.persistence.size` | Volume size | `20Gi` |
| `postgresql.resources.requests.memory` | Memory request | `256Mi` |
| `postgresql.resources.limits.memory` | Memory limit | `1Gi` |

#### Redis

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Enable Redis StatefulSet | `true` |
| `redis.image.repository` | Redis image | `redis` |
| `redis.image.tag` | Redis version | `7-alpine` |
| `redis.persistence.enabled` | Enable persistence | `true` |
| `redis.persistence.size` | Volume size | `5Gi` |
| `redis.resources.requests.memory` | Memory request | `128Mi` |
| `redis.resources.limits.memory` | Memory limit | `512Mi` |

#### Application Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.nodeEnv` | Node environment | `production` |
| `config.logLevel` | Log level | `info` |
| `config.swaggerEnabled` | Enable Swagger UI | `true` |
| `config.corsAllowedOrigins` | CORS allowed origins | `*` |
| `config.rateLimitDefault` | Default rate limit | `1000` |
| `config.auditLogRetentionDays` | Audit log retention | `90` |

## Usage

### Upgrade

```bash
# Development
helm upgrade rosterhub . \
  --namespace rosterhub-dev \
  --values values-dev.yaml

# Production
helm upgrade rosterhub . \
  --namespace rosterhub \
  --values values-prod.yaml
```

### Rollback

```bash
# View release history
helm history rosterhub --namespace rosterhub

# Rollback to previous version
helm rollback rosterhub --namespace rosterhub

# Rollback to specific revision
helm rollback rosterhub 1 --namespace rosterhub
```

### Uninstall

```bash
# Development
helm uninstall rosterhub --namespace rosterhub-dev

# Production
helm uninstall rosterhub --namespace rosterhub
```

**Note**: Persistent volumes will not be deleted automatically. To delete them:

```bash
kubectl delete pvc -n rosterhub -l app.kubernetes.io/instance=rosterhub
```

## Advanced Configuration

### Using External Database

If you want to use an external PostgreSQL database instead of the included StatefulSet:

```yaml
postgresql:
  enabled: false

secrets:
  databaseUrl: "postgresql://user:password@external-host:5432/rosterhub"
```

### Using External Redis

If you want to use an external Redis instance:

```yaml
redis:
  enabled: false

secrets:
  redisUrl: "redis://:password@external-host:6379"
```

### Custom Resource Limits

```yaml
api:
  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
```

### Custom Storage Classes

```yaml
postgresql:
  persistence:
    storageClass: "premium-ssd"
    size: 100Gi

redis:
  persistence:
    storageClass: "premium-ssd"
    size: 20Gi
```

### Node Affinity and Tolerations

```yaml
api:
  nodeSelector:
    node-type: application

  tolerations:
    - key: "dedicated"
      operator: "Equal"
      value: "application"
      effect: "NoSchedule"

  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                  - amd64
```

## Monitoring

### Health Checks

The API includes health check endpoints:

- **Liveness**: `GET /health` - Returns 200 if the application is running
- **Readiness**: `GET /health` - Returns 200 if the application is ready to serve traffic

### Metrics

To enable Prometheus metrics collection, add annotations to the API pods:

```yaml
api:
  podAnnotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/metrics"
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n rosterhub
```

### View Pod Logs

```bash
# API logs
kubectl logs -n rosterhub -l app=rosterhub-api --tail=100 -f

# PostgreSQL logs
kubectl logs -n rosterhub -l app=postgres --tail=100 -f

# Redis logs
kubectl logs -n rosterhub -l app=redis --tail=100 -f
```

### Describe Pod

```bash
kubectl describe pod -n rosterhub <pod-name>
```

### Access Pod Shell

```bash
# API pod
kubectl exec -it -n rosterhub <api-pod-name> -- /bin/sh

# PostgreSQL pod
kubectl exec -it -n rosterhub <postgres-pod-name> -- /bin/sh

# Redis pod
kubectl exec -it -n rosterhub <redis-pod-name> -- /bin/sh
```

### Database Migration Issues

If migrations fail, check the init container logs:

```bash
kubectl logs -n rosterhub <api-pod-name> -c migrate
```

### Common Issues

1. **Pods stuck in Pending state**
   - Check if PersistentVolumes can be provisioned: `kubectl get pvc -n rosterhub`
   - Check node resources: `kubectl top nodes`

2. **ImagePullBackOff errors**
   - Verify image repository and tag
   - Check imagePullSecrets if using private registry

3. **CrashLoopBackOff**
   - Check pod logs: `kubectl logs -n rosterhub <pod-name>`
   - Verify database connectivity
   - Check environment variables and secrets

4. **Database connection errors**
   - Verify PostgreSQL is running: `kubectl get statefulset -n rosterhub`
   - Check secret values: `kubectl get secret rosterhub-secret -n rosterhub -o yaml`
   - Test database connection from API pod

## Security Considerations

### Secrets Management

In production, consider using external secret management solutions:

- **Kubernetes External Secrets**: Sync secrets from AWS Secrets Manager, Azure Key Vault, etc.
- **Sealed Secrets**: Encrypt secrets in Git repositories
- **Vault**: HashiCorp Vault integration

Example with External Secrets:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rosterhub-secret
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: rosterhub-secret
  data:
    - secretKey: postgres-password
      remoteRef:
        key: rosterhub/postgres-password
```

### Network Policies

Consider implementing NetworkPolicies to restrict pod-to-pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: rosterhub-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
    - to:
        - podSelector:
            matchLabels:
              app: redis
```

## License

Copyright (c) 2025 RosterHub Team

## Support

For issues and questions, please visit:
- GitHub Issues: https://github.com/rosterhub/rosterhub/issues
- Documentation: https://docs.rosterhub.example.com
