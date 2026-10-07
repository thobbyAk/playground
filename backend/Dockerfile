FROM node:22

WORKDIR /app


COPY package.json package-lock.json /app/

RUN npm ci

COPY . .

RUN yarn build 

EXPOSE 4000

CMD [ "npm" , "run", "dev" ]