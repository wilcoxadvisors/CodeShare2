FROM node:20 AS node-base

# Node.js app setup
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Add Python and ML dependencies
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install pyspark==3.5.1 "dask[complete]==2025.4.0" xgboost==2.0.3 shap==0.45.*

# Expose ports
EXPOSE 5000
EXPOSE 5001

# Start command
CMD ["npm", "start"]