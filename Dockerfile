FROM public.ecr.aws/lambda/nodejs:14

RUN npm --version \
    npm install --production

COPY ./ ${LAMBDA_TASK_ROOT}
