import { APIGatewayProxyResult } from "aws-lambda";

export const handler = async (): Promise<APIGatewayProxyResult> => {
  const version = "3";

  console.log(version);

  return {
    statusCode: 200,
    body: version,
  };
};
