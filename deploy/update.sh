#!/bin/bash
rm -rf dist
npm run i
npm run compile
npx sequelize db:migrate
npm run deploy