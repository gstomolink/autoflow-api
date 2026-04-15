import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with userId and password' })
  @ApiOkResponse({
    schema: {
      example: {
        accessToken: 'jwt-token',
        user: {
          id: 'uuid',
          fullName: 'System Super Admin',
          userId: 'admin',
          email: null,
          role: 1,
          shopId: null,
          staffType: null,
        },
      },
    },
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
