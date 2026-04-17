package vn.edu.hust.api_gateway.exception;

import org.springframework.http.HttpStatus;

public class HustGoException extends RuntimeException{
  private HttpStatus status;
  private String message;

  public HustGoException(HttpStatus status, String message) {
    this.status = status;
    this.message = message;
  }

  public HustGoException(String message, HttpStatus status, String message1) {
    super(message);
    this.status = status;
    this.message = message1;
  }

  public HttpStatus getStatus() {
    return status;
  }

  @Override
  public String getMessage() {
    return message;
  }
}
