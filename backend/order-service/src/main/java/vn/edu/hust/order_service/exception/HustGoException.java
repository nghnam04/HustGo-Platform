package vn.edu.hust.order_service.exception;

import org.springframework.http.HttpStatus;

public class HustGoException extends RuntimeException {
  private final HttpStatus status;
  private final String message;

  public HustGoException(HttpStatus status, String message) {
    super(message);
    this.status = status;
    this.message = message;
  }

  public HttpStatus getStatus() {
    return status;
  }

  @Override
  public String getMessage() {
    return message;
  }
}