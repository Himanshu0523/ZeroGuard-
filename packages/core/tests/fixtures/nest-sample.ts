import { Controller, Get, Post } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  getUser() {
    // handler
  }

  @Post()
  createUser() {
    // handler
  }
}
