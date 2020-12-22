FROM node:6.2.2

ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN cp -a /tmp/node_modules /

WORKDIR /app
ADD app /app/

ENTRYPOINT ["node", "--max_old_space_size=4096", "/app/packager.js"]
