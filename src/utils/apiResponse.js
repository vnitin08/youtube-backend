class apiResponse {
  constructor(data, statusCode, message = "Success") {
    this.data = data;
    this.status = statusCode;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { apiResponse }