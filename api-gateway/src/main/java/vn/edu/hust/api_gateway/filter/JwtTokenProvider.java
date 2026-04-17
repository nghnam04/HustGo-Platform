package vn.edu.hust.api_gateway.filter;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.UnsupportedKeyException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.edu.hust.api_gateway.exception.HustGoException;

import javax.crypto.SecretKey;
import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenProvider {
    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpirationDate;

    //generate key
    public Key key(){
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }


    //get username(email) from Token
    public String getUsername(String token){
        return Jwts.parser()
                .verifyWith((SecretKey) key())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    //validate JWT token
    public boolean validateToken(String token){
        try{
            Jwts.parser()
                    .verifyWith((SecretKey) key())
                    .build()
                    .parse(token);
            return true;
        }catch (MalformedJwtException malformedJwtException){
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Token sai định dạng");
        }catch (ExpiredJwtException expiredJwtException){
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Token hết hạn");
        }catch (UnsupportedKeyException unsupportedKeyException){
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Token sử sử dụng key/thuật toán ký không được hỗ trợ");
        }catch (IllegalArgumentException illegalArgumentException){
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Token rỗng/chứa dữ liệu không hợp lệ");
        }
    }

    public Date extractExpiration(String token) {
        return Jwts.parser()
                .verifyWith((SecretKey) key())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getExpiration();
    }
}
