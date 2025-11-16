# Kubernetes Deployment Guide

This guide covers deploying RosterHub to a Kubernetes cluster using either Helm or Kustomize.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Deployment Options](#deployment-options)
  - [Option 1: Helm (Recommended)](#option-1-helm-recommended)
  - [Option 2: Kustomize](#option-2-kustomize)
- [Configuration](#configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Prerequisites

### Required Components

1. **Kubernetes Cluster** (v1.25+)
   - Managed Kubernetes: GKE, EKS, AKS, or similar
   - Self-hosted: kubeadm, k3s, or similar
   - Minimum 3 worker nodes (recommended)

2. **kubectl** (v1.25+)
   ```bash
   kubectl version --client
   ```

3. **Helm** (v3.8+) - if using Helm deployment
   ```bash
   helm version
   ```

4. **Storage Provisioner**
   - Dynamic volume provisioning support
   - Recommended storage classes:
     - Development: `standard` (default)
     - Production: `premium-ssd` or equivalent

### Required Add-ons

1. **NGINX Ingress Controller**
   ```bash
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm repo update
   helm install ingress-nginx ingress-nginx/ingress-nginx \
     --namespace ingress-nginx \
     --create-namespace
   ```

2. **cert-manager** (for automatic TLS)
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

   Create ClusterIssuer for Let's Encrypt:
   ```yaml
   apiVersion: cert-manager.io/v1
   kind: ClusterIssuer
   metadata:
     name: letsencrypt-prod
   spec:
     acme:
       server: https://acme-v02.api.letsencrypt.org/directory
       email: admin@rosterhub.example.com
       privateKeySecretRef:
         name: letsencrypt-prod
       solvers:
         - http01:
             ingress:
               class: nginx
   ```

## Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                   │
│                                                          │
│  ┌────────────────┐      ┌─────────────────────────┐   │
│  │ Ingress NGINX  │─────▶│  API Pods (2-20)        │   │
│  │  (TLS Termination)    │  - RosterHub API        │   │
│  └────────────────┘      │  - Health checks        │   │
│                          │  - Auto-scaling (HPA)   │   │
│                          └──────────┬──────────────┘   │
│                                     │                   │
│                          ┌──────────┴──────────────┐   │
│                          │                         │   │
│                   ┌──────▼──────┐        ┌────────▼──┐ │
│                   │ PostgreSQL  │        │   Redis   │ │
│                   │ StatefulSet │        │StatefulSet│ │
│                   │  - 20-100Gi │        │  - 5-20Gi │ │
│                   │  - Replicas:1│       │ - Replicas:1│
│                   └─────────────┘        └───────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Resource Allocation

#### Development Environment

| Component | Replicas | CPU Request | CPU Limit | Memory Request | Memory Limit | Storage |
|-----------|----------|-------------|-----------|----------------|--------------|---------|
| API       | 1        | 50m         | 250m      | 128Mi          | 256Mi        | -       |
| PostgreSQL| 1        | 50m         | 500m      | 128Mi          | 512Mi        | 5Gi     |
| Redis     | 1        | 25m         | 250m      | 64Mi           | 256Mi        | 1Gi     |

**Total**: ~125m CPU, ~320Mi Memory, ~6Gi Storage

#### Production Environment

| Component | Replicas | CPU Request | CPU Limit | Memory Request | Memory Limit | Storage |
|-----------|----------|-------------|-----------|----------------|--------------|---------|
| API       | 3-20     | 250m        | 1000m     | 512Mi          | 1Gi          | -       |
| PostgreSQL| 1        | 500m        | 2000m     | 1Gi            | 4Gi          | 100Gi   |
| Redis     | 1        | 250m        | 1000m     | 512Mi          | 2Gi          | 20Gi    |

**Minimum Total** (3 API replicas): ~1.5 CPU, ~2.5Gi Memory, ~120Gi Storage
**Maximum Total** (20 API replicas): ~6 CPU, ~22Gi Memory, ~120Gi Storage

## Deployment Options

### Option 1: Helm (Recommended)

Helm provides the easiest way to deploy and manage RosterHub with pre-configured templates.

#### 1. Generate Secrets

```bash
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 32)
```

#### 2. Development Deployment

```bash
cd helm/rosterhub

helm install rosterhub . \
  --namespace rosterhub-dev \
  --create-namespace \
  --values values-dev.yaml \
  --set secrets.postgresPassword="$POSTGRES_PASSWORD" \
  --set secrets.redisPassword="$REDIS_PASSWORD" \
  --set secrets.jwtSecret="$JWT_SECRET" \
  --set api.ingress.hosts[0].host="api-dev.rosterhub.example.com" \
  --set api.ingress.tls[0].hosts[0]="api-dev.rosterhub.example.com"
```

#### 3. Production Deployment

```bash
cd helm/rosterhub

helm install rosterhub . \
  --namespace rosterhub \
  --create-namespace \
  --values values-prod.yaml \
  --set secrets.postgresPassword="$POSTGRES_PASSWORD" \
  --set secrets.redisPassword="$REDIS_PASSWORD" \
  --set secrets.jwtSecret="$JWT_SECRET" \
  --set api.ingress.hosts[0].host="api.rosterhub.example.com" \
  --set api.ingress.tls[0].hosts[0]="api.rosterhub.example.com" \
  --set config.corsAllowedOrigins="https://rosterhub.example.com,https://app.rosterhub.example.com"
```

#### 4. Verify Deployment

```bash
# Check deployment status
helm status rosterhub --namespace rosterhub

# Check pods
kubectl get pods -n rosterhub

# Check services
kubectl get svc -n rosterhub

# Check ingress
kubectl get ingress -n rosterhub
```

#### 5. Upgrade

```bash
helm upgrade rosterhub . \
  --namespace rosterhub \
  --values values-prod.yaml
```

#### 6. Rollback

```bash
# View history
helm history rosterhub --namespace rosterhub

# Rollback to previous version
helm rollback rosterhub --namespace rosterhub
```

### Option 2: Kustomize

Kustomize provides a template-free way to customize Kubernetes manifests.

#### 1. Create Secrets

Create a `k8s/overlays/production/secret.yaml` file (DO NOT commit to Git):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rosterhub-secret
type: Opaque
stringData:
  database-url: "postgresql://rosterhub:<POSTGRES_PASSWORD>@postgres:5432/rosterhub"
  redis-url: "redis://:<REDIS_PASSWORD>@redis:6379"
  jwt-secret: "<JWT_SECRET>"
  jwt-expires-in: "1h"
  jwt-refresh-expires-in: "7d"
  postgres-user: "rosterhub"
  postgres-password: "<POSTGRES_PASSWORD>"
  postgres-db: "rosterhub"
  redis-password: "<REDIS_PASSWORD>"
```

Replace `<POSTGRES_PASSWORD>`, `<REDIS_PASSWORD>`, and `<JWT_SECRET>` with generated values:

```bash
openssl rand -base64 32  # Run three times for each secret
```

#### 2. Development Deployment

```bash
kubectl apply -k k8s/overlays/development
```

#### 3. Production Deployment

```bash
# First, create the secret
kubectl create namespace rosterhub
kubectl apply -f k8s/overlays/production/secret.yaml

# Then apply the kustomization
kubectl apply -k k8s/overlays/production
```

#### 4. Verify Deployment

```bash
# Check all resources
kubectl get all -n rosterhub

# Check pods in detail
kubectl get pods -n rosterhub -o wide

# Check persistent volumes
kubectl get pvc -n rosterhub
```

#### 5. Update Deployment

```bash
# Apply changes
kubectl apply -k k8s/overlays/production

# Check rollout status
kubectl rollout status deployment/rosterhub-api -n rosterhub
```

## Configuration

### Environment-Specific Configuration

#### Development

- **Replicas**: 1 API pod
- **Resources**: Minimal (128-256Mi memory, 50-250m CPU)
- **Logging**: Debug level with full HTTP logging
- **Swagger**: Enabled
- **CORS**: Open (`*`)
- **Auto-scaling**: Disabled

#### Production

- **Replicas**: 3 API pods (auto-scales 3-20)
- **Resources**: Production-grade (512Mi-1Gi memory, 250m-1000m CPU)
- **Logging**: Warning level only
- **Swagger**: Disabled (security)
- **CORS**: Restricted to specific origins
- **Auto-scaling**: Enabled (CPU/Memory based)

### Customizing Configuration

#### Using Helm

Edit `values-prod.yaml` or override with `--set`:

```bash
helm upgrade rosterhub . \
  --namespace rosterhub \
  --set api.replicaCount=5 \
  --set config.logLevel="info" \
  --set postgresql.persistence.size=200Gi
```

#### Using Kustomize

Edit `k8s/overlays/production/configmap-patch.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rosterhub-config
data:
  log-level: "info"
  rate-limit-default: "5000"
```

### Database Migration

Migrations run automatically via init container before the API starts. To run migrations manually:

```bash
# Get API pod name
POD=$(kubectl get pod -n rosterhub -l app=rosterhub-api -o jsonpath="{.items[0].metadata.name}")

# Run migrations
kubectl exec -n rosterhub $POD -- npx prisma migrate deploy
```

### Scaling

#### Manual Scaling

```bash
# Scale API pods
kubectl scale deployment rosterhub-api --replicas=5 -n rosterhub
```

#### Auto-scaling Configuration

The HorizontalPodAutoscaler automatically scales based on:

- **CPU Utilization**: Target 60-70%
- **Memory Utilization**: Target 70-80%
- **Custom Metrics**: HTTP requests per second (if metrics server configured)

View HPA status:

```bash
kubectl get hpa -n rosterhub
kubectl describe hpa rosterhub-api -n rosterhub
```

## Monitoring and Maintenance

### Health Checks

All services include liveness and readiness probes:

```bash
# API health endpoint
kubectl exec -n rosterhub $POD -- curl http://localhost:3000/health

# PostgreSQL health
kubectl exec -n rosterhub postgres-0 -- pg_isready -U rosterhub

# Redis health
kubectl exec -n rosterhub redis-0 -- redis-cli ping
```

### Viewing Logs

```bash
# API logs (all pods)
kubectl logs -n rosterhub -l app=rosterhub-api --tail=100 -f

# Specific pod
kubectl logs -n rosterhub rosterhub-api-<pod-id> --tail=100 -f

# PostgreSQL logs
kubectl logs -n rosterhub postgres-0 --tail=100 -f

# Redis logs
kubectl logs -n rosterhub redis-0 --tail=100 -f

# Init container (migrations)
kubectl logs -n rosterhub rosterhub-api-<pod-id> -c migrate
```

### Database Backup

#### Manual Backup

```bash
# Create backup
kubectl exec -n rosterhub postgres-0 -- \
  pg_dump -U rosterhub rosterhub > backup-$(date +%Y%m%d).sql

# Restore backup
kubectl exec -i -n rosterhub postgres-0 -- \
  psql -U rosterhub rosterhub < backup-20251116.sql
```

#### Automated Backup (CronJob)

Create `k8s/base/backup-cronjob.yaml`:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:15-alpine
              command:
                - /bin/sh
                - -c
                - pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > /backup/backup-$(date +\%Y\%m\%d-\%H\%M).sql.gz
              env:
                - name: POSTGRES_USER
                  valueFrom:
                    secretKeyRef:
                      name: rosterhub-secret
                      key: postgres-user
                - name: POSTGRES_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: rosterhub-secret
                      key: postgres-password
                - name: POSTGRES_DB
                  valueFrom:
                    secretKeyRef:
                      name: rosterhub-secret
                      key: postgres-db
              volumeMounts:
                - name: backup
                  mountPath: /backup
          restartPolicy: OnFailure
          volumes:
            - name: backup
              persistentVolumeClaim:
                claimName: postgres-backup-pvc
```

### Redis Backup

Redis uses AOF (Append-Only File) persistence by default. To create a snapshot:

```bash
# Trigger BGSAVE
kubectl exec -n rosterhub redis-0 -- redis-cli BGSAVE

# Check last save time
kubectl exec -n rosterhub redis-0 -- redis-cli LASTSAVE
```

### Resource Monitoring

```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods -n rosterhub

# Describe HPA
kubectl describe hpa rosterhub-api -n rosterhub
```

## Troubleshooting

### Common Issues

#### 1. Pods in Pending State

**Symptom**: Pods stuck in `Pending` status

**Causes**:
- Insufficient cluster resources
- PersistentVolume provisioning failure
- Node selector/affinity not matching

**Investigation**:
```bash
kubectl describe pod <pod-name> -n rosterhub
kubectl get pvc -n rosterhub
kubectl get events -n rosterhub --sort-by='.lastTimestamp'
```

**Solutions**:
- Scale up cluster nodes
- Check storage class provisioner
- Adjust resource requests/limits

#### 2. ImagePullBackOff

**Symptom**: Cannot pull container image

**Causes**:
- Image doesn't exist
- Authentication required for private registry
- Network issues

**Investigation**:
```bash
kubectl describe pod <pod-name> -n rosterhub
```

**Solutions**:
- Verify image name and tag
- Create imagePullSecret for private registry
- Check network connectivity

#### 3. CrashLoopBackOff

**Symptom**: Container starts then crashes repeatedly

**Causes**:
- Application error
- Missing environment variables
- Database connection failure

**Investigation**:
```bash
kubectl logs -n rosterhub <pod-name> --previous
kubectl describe pod <pod-name> -n rosterhub
```

**Solutions**:
- Check application logs
- Verify all secrets are set
- Test database connectivity

#### 4. Database Connection Errors

**Symptom**: API can't connect to PostgreSQL

**Investigation**:
```bash
# Check PostgreSQL pod
kubectl get pod -n rosterhub postgres-0

# Check PostgreSQL logs
kubectl logs -n rosterhub postgres-0

# Test connection from API pod
kubectl exec -n rosterhub <api-pod> -- \
  psql $DATABASE_URL -c "SELECT 1"

# Verify secret
kubectl get secret rosterhub-secret -n rosterhub -o yaml
```

**Solutions**:
- Ensure PostgreSQL pod is running
- Verify DATABASE_URL format
- Check network policies

#### 5. Ingress Not Working

**Symptom**: Cannot access API via domain

**Investigation**:
```bash
# Check ingress
kubectl get ingress -n rosterhub
kubectl describe ingress rosterhub-api -n rosterhub

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx <ingress-controller-pod>

# Check DNS
nslookup api.rosterhub.example.com
```

**Solutions**:
- Verify DNS points to ingress load balancer IP
- Check ingress controller logs
- Verify TLS certificate

#### 6. TLS Certificate Issues

**Symptom**: Certificate not issued or invalid

**Investigation**:
```bash
# Check certificate
kubectl get certificate -n rosterhub
kubectl describe certificate rosterhub-api-tls -n rosterhub

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

**Solutions**:
- Verify ClusterIssuer is created
- Check DNS propagation
- Review cert-manager logs

### Debug Mode

Enable debug logging temporarily:

```bash
# Using Helm
helm upgrade rosterhub . \
  --namespace rosterhub \
  --set config.logLevel="debug" \
  --set config.debugHttpLogging="true" \
  --set config.databaseQueryLogging="true"

# Using Kustomize
kubectl set env deployment/rosterhub-api -n rosterhub \
  LOG_LEVEL=debug \
  DEBUG_HTTP_LOGGING=true \
  DATABASE_QUERY_LOGGING=true
```

### Accessing Pod Shell

```bash
# API pod
kubectl exec -it -n rosterhub <api-pod-name> -- /bin/sh

# PostgreSQL pod
kubectl exec -it -n rosterhub postgres-0 -- /bin/sh

# Redis pod
kubectl exec -it -n rosterhub redis-0 -- /bin/sh
```

## Security Best Practices

### 1. Use External Secret Management

For production, use external secret managers:

**AWS Secrets Manager**:
```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace
```

**Azure Key Vault**, **HashiCorp Vault**, etc. are also supported.

### 2. Network Policies

Restrict pod-to-pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rosterhub-api-netpol
  namespace: rosterhub
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
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

### 3. Pod Security Standards

Enable Pod Security Admission:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rosterhub
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 4. RBAC

Limit service account permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: rosterhub-api-role
  namespace: rosterhub
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: rosterhub-api-rolebinding
  namespace: rosterhub
subjects:
  - kind: ServiceAccount
    name: rosterhub-api
    namespace: rosterhub
roleRef:
  kind: Role
  name: rosterhub-api-role
  apiGroup: rbac.authorization.k8s.io
```

### 5. Disable Swagger in Production

```bash
helm upgrade rosterhub . \
  --namespace rosterhub \
  --set config.swaggerEnabled=false
```

### 6. Restrict CORS Origins

```bash
helm upgrade rosterhub . \
  --namespace rosterhub \
  --set config.corsAllowedOrigins="https://rosterhub.example.com,https://app.rosterhub.example.com"
```

### 7. Enable Rate Limiting

Already configured in Ingress annotations:

```yaml
nginx.ingress.kubernetes.io/limit-rps: "100"
```

Adjust as needed:

```bash
helm upgrade rosterhub . \
  --namespace rosterhub \
  --set api.ingress.annotations."nginx\.ingress\.kubernetes\.io/limit-rps"="50"
```

## Performance Optimization

### 1. Resource Tuning

Monitor actual usage and adjust:

```bash
# Monitor for 1 week
kubectl top pods -n rosterhub

# Adjust based on P95 usage
helm upgrade rosterhub . \
  --namespace rosterhub \
  --set api.resources.requests.memory="1Gi" \
  --set api.resources.limits.memory="2Gi"
```

### 2. PostgreSQL Tuning

For high-traffic deployments, increase PostgreSQL resources:

```bash
helm upgrade rosterhub . \
  --namespace rosterhub \
  --set postgresql.resources.limits.memory="8Gi" \
  --set postgresql.config.sharedBuffers="2GB" \
  --set postgresql.config.effectiveCacheSize="6GB"
```

### 3. Redis Tuning

For cache-heavy workloads:

```bash
helm upgrade rosterhub . \
  --namespace rosterhub \
  --set redis.config.maxmemory="2gb" \
  --set redis.resources.limits.memory="4Gi"
```

### 4. Horizontal Pod Autoscaler Tuning

Adjust scaling thresholds:

```bash
helm upgrade rosterhub . \
  --namespace rosterhub \
  --set api.autoscaling.targetCPUUtilizationPercentage=50 \
  --set api.autoscaling.maxReplicas=30
```

## Disaster Recovery

### Full System Backup

1. **Backup PostgreSQL data**
2. **Backup Redis data** (optional, cache can be rebuilt)
3. **Backup Kubernetes manifests** (stored in Git)
4. **Backup secrets** (use external secret manager)

### Recovery Procedure

1. **Restore cluster** (if needed)
2. **Redeploy infrastructure** (ingress-nginx, cert-manager)
3. **Restore secrets**
4. **Deploy application** (Helm or Kustomize)
5. **Restore PostgreSQL backup**
6. **Verify health checks**

## Maintenance Windows

### Rolling Update (Zero Downtime)

```bash
# Update image
helm upgrade rosterhub . \
  --namespace rosterhub \
  --set api.image.tag="v1.1.0"

# Kubernetes will perform rolling update automatically
# Monitor progress:
kubectl rollout status deployment/rosterhub-api -n rosterhub
```

### Scheduled Maintenance

```bash
# Scale down to 0 (downtime)
kubectl scale deployment rosterhub-api --replicas=0 -n rosterhub

# Perform maintenance...

# Scale back up
kubectl scale deployment rosterhub-api --replicas=3 -n rosterhub
```

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager](https://cert-manager.io/docs/)
- [PostgreSQL on Kubernetes](https://www.postgresql.org/docs/)
- [Redis on Kubernetes](https://redis.io/docs/)

## Support

For deployment issues:
- GitHub Issues: https://github.com/rosterhub/rosterhub/issues
- Documentation: https://docs.rosterhub.example.com
- Community: https://community.rosterhub.example.com
