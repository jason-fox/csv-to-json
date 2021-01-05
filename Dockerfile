FROM node:14-alpine AS node
FROM node AS final
WORKDIR /app                            
COPY package*.json ./                   
RUN npm i --only=production             
COPY . .                 
# Open desired port
EXPOSE 3000
# Use js files to run the application
ENTRYPOINT ["node", "./bin/www"]