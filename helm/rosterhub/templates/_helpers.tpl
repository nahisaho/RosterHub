{{/*
Expand the name of the chart.
*/}}
{{- define "rosterhub.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "rosterhub.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "rosterhub.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "rosterhub.labels" -}}
helm.sh/chart: {{ include "rosterhub.chart" . }}
{{ include "rosterhub.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "rosterhub.selectorLabels" -}}
app.kubernetes.io/name: {{ include "rosterhub.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "rosterhub.serviceAccountName" -}}
{{- if .Values.api.serviceAccount.create }}
{{- default (include "rosterhub.fullname" .) .Values.api.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.api.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
API labels
*/}}
{{- define "rosterhub.api.labels" -}}
{{ include "rosterhub.labels" . }}
app: {{ .Values.api.name }}
{{- end }}

{{/*
API selector labels
*/}}
{{- define "rosterhub.api.selectorLabels" -}}
{{ include "rosterhub.selectorLabels" . }}
app: {{ .Values.api.name }}
{{- end }}

{{/*
PostgreSQL labels
*/}}
{{- define "rosterhub.postgres.labels" -}}
{{ include "rosterhub.labels" . }}
app: {{ .Values.postgresql.name }}
{{- end }}

{{/*
PostgreSQL selector labels
*/}}
{{- define "rosterhub.postgres.selectorLabels" -}}
{{ include "rosterhub.selectorLabels" . }}
app: {{ .Values.postgresql.name }}
{{- end }}

{{/*
Redis labels
*/}}
{{- define "rosterhub.redis.labels" -}}
{{ include "rosterhub.labels" . }}
app: {{ .Values.redis.name }}
{{- end }}

{{/*
Redis selector labels
*/}}
{{- define "rosterhub.redis.selectorLabels" -}}
{{ include "rosterhub.selectorLabels" . }}
app: {{ .Values.redis.name }}
{{- end }}
