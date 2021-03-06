"use strict";

const AWS = require("aws-sdk");
const middy = require("middy");
const {
  cors
} = require("middy/middlewares");

const tableName = process.env.DYNAMODB_INFO_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const loadInfo = (event, context, callback) => {
  const params = {
    TableName: tableName
  };

  dynamoDb.scan(params, (error, result) => {
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Couldn't fetch the info."
        })
      });
      return;
    }
    callback(null, {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(result.Items)
    });
  });
};

const updateInfo = (dataName) => {
  const params = {
    TableName: tableName,
    Key: {
      name: dataName
    }
  };

  dynamoDb.get(params, (error, result) => {
    if (error) {
      console.error(error);
      return;
    }
    if (result.Item == null) {
      _createInfo(dataName);
    } else {
      _updateInfo(dataName);
    }
  });
};

function _updateInfo(dataName) {
  const timestamp = new Date().getTime();

  const params = {
    TableName: tableName,
    Key: {
      name: dataName
    },
    ExpressionAttributeValues: {
      ":updateDate": timestamp
    },
    UpdateExpression: "SET updateDate = :updateDate",
    ReturnValues: "ALL_NEW"
  };

  dynamoDb.update(params, (error, result) => {
    if (error) {
      console.error(error);
      return;
    }
    console.log(`Updated info at ${timestamp}`);
  });
}

function _createInfo(dataName) {
  const timestamp = new Date().getTime();

  const params = {
    TableName: tableName,
    Item: {
      name: dataName,
      updateDate: timestamp
    }
  };

  dynamoDb.put(params, error => {
    if (error) {
      console.error(error);
      return;
    }
    console.log(`Created info at ${timestamp}`);
  });
}

const loadHandler = middy(loadInfo)
  .use(cors())

module.exports = {
  loadHandler,
  updateInfo
}