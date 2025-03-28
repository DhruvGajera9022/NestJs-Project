import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditProfileDTO } from './dto/edit-profile.dto';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import { uploadToCloudinary } from 'src/utils/cloudinary.util';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  // Get Profile
  async getProfile(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        posts: {
          orderBy: [{ pinned: 'desc' }, { created_at: 'desc' }],
          omit: { userId: true },
        },
      },
      omit: { password: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Edit Profile
  async editProfile(
    userId: number,
    editProfileDto: EditProfileDTO,
    file: Express.Multer.File,
  ) {
    const { firstName, lastName, email, is_private } = editProfileDto;
    const convertIsPrivate =
      typeof is_private === 'string' ? is_private === 'true' : !!is_private;

    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const uploadResult = await uploadToCloudinary(file.path);
      await fs.promises.unlink(file.path);
      const file_url = uploadResult.secure_url;

      const updateUser = await this.prisma.users.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          email,
          profile_picture: file_url,
          is_private: convertIsPrivate,
        },
      });

      const { password: _, ...result } = updateUser;
      return result;
    } catch (error) {
      // Removing if error occurs
      if (file.path && fs.existsSync(file.path)) {
        await fs.unlinkSync(file.path);
      }
      throw new InternalServerErrorException('Error in edit profile', error);
    }
  }

  // Request to Follow
  async requestToFollow(targetId: number, userId: number) {
    try {
      const targetUser = await this.prisma.users.findUnique({
        where: { id: targetId },
      });
      if (!targetUser) {
        throw new NotFoundException('User not found');
      }

      if (!targetUser.is_private) {
        // If public, follow directly
        const existingFollow = await this.prisma.followers.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: targetId,
            },
          },
        });
        if (existingFollow) {
          throw new BadRequestException('You are already following this user.');
        }

        await this.prisma.followers.create({
          data: { followerId: userId, followingId: targetId },
        });

        return { message: 'You are now following this user.' };
      }

      // Check if a request already exists
      const existingRequest = await this.prisma.followRequests.findUnique({
        where: { requesterId_targetId: { requesterId: userId, targetId } },
      });
      if (existingRequest) {
        throw new BadRequestException('Follow request already sent.');
      }

      // Create follow request
      await this.prisma.followRequests.create({
        data: { requesterId: userId, targetId },
      });

      return { message: 'Follow request sent.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Accept Follow Request
  async acceptFollowRequest(targetId: number, userId: number) {
    try {
      // Check if request exists
      const request = await this.prisma.followRequests.findUnique({
        where: { requesterId_targetId: { requesterId: userId, targetId } },
      });
      if (!request) {
        throw new BadRequestException('No follow request found.');
      }

      await this.prisma.$transaction([
        // Move request to followers
        this.prisma.followers.create({
          data: { followerId: userId, followingId: targetId },
        }),
        // Delete request from follow_requests
        this.prisma.followRequests.delete({
          where: { id: request.id },
        }),
      ]);

      return { message: 'Follow request accepted.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Cancel Follow Request
  async cancelFollowRequest(requesterId: number, targetId: number) {
    try {
      const followRequest = await this.prisma.followRequests.findFirst({
        where: { requesterId, targetId },
      });
      if (!followRequest) {
        throw new BadRequestException('No follow request found.');
      }

      await this.prisma.followRequests.delete({
        where: { id: followRequest.id },
      });
      return { message: 'Follow request canceled successfully.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Unfollow user
  async unfollowUser(targetId: number, userId: number) {
    try {
      await this.prisma.followers.deleteMany({
        where: { followerId: userId, followingId: targetId },
      });

      return { message: 'Unfollowed successfully.' };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
