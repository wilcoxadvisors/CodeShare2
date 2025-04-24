# Architecture Overview

## Application Structure

The application follows a modern web architecture with:

- Client-side: React with TypeScript, using Tailwind CSS for styling
- Server-side: Node.js using Express
- Database: PostgreSQL with custom ORM

## Core Components

- **Client Management**: Handling client information and relationships
- **Entity Management**: Tracking financial entities
- **Account Management**: Chart of Accounts implementation
- **Journal Entry System**: Financial transaction recording
- **Reporting Layer**: Generating financial statements and insights
- **User Authentication**: Secure login and permissions

## Data Flow

1. User authenticates through secure login
2. Client and entity selection establishes context
3. Financial data is entered through forms or API
4. Data processing applies business rules
5. Reporting generates insights

## Technical Implementation

- **Storage Layer**: PostgreSQL with custom abstraction
- **API Layer**: RESTful endpoints with validation
- **UI Layer**: Component-based React architecture
- **Authentication**: Session-based with secure cookies

## Integration Capabilities

- **External APIs**: Connection to financial data services
- **Import/Export**: Support for common financial data formats
- **Webhook Support**: Real-time notifications

## Big-Data ML

The application leverages advanced Big Data and Machine Learning technologies to provide predictive analytics and deep insights:

- **Spark MLlib**: Apache Spark's machine learning library (v3.5.1) for distributed machine learning on large datasets
  - Time series forecasting with ARIMA models
    - ARIMA model artifacts stored under models/forecast/{entity_id}
    - Per-entity forecasting for granular financial predictions
  - Classification and clustering algorithms
  - Feature engineering at scale

- **Dask**: Parallel computing library (v2025.4.0) that scales Python analytics
  - Distributed DataFrame processing
  - Parallel ETL pipelines
  - Integration with pandas for familiar APIs at scale

- **XGBoost**: Gradient boosting library (v2.0.3) for high-performance ML
  - Advanced regression modeling
  - Classification for financial anomaly detection
  - Feature importance ranking

- **SHAP (SHapley Additive exPlanations)**: Explainable AI framework (v0.45.*)
  - Model interpretation for financial forecasts
  - Transparent insights into prediction drivers
  - Visual explanations of complex model decisions

This ML stack provides a robust foundation for processing large volumes of financial data, generating accurate forecasts, detecting anomalies, and delivering explainable insights to users.

XGBoost anomaly model saved at models/anomaly/, SHAP API /ai/anomalies/:entity.