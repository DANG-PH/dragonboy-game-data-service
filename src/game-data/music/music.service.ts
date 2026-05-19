// music.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { MusicEntity } from './music.entity';
import {
  Empty,
  GetAllMusicResponse,
  ThemMusicRequest,
  SuaMusicRequest,
  XoaMusicRequest,
  Music,
  MusicStatus,
} from '../../../proto/game-data.pb';

@Injectable()
export class MusicService {
  constructor(
    @InjectRepository(MusicEntity)
    private readonly musicRepo: Repository<MusicEntity>,
  ) {}

  private toProto(m: MusicEntity): Music {
    return {
      id: m.id,
      name: m.name,
      file_url: m.fileUrl,
      hash: m.hash,
      status: m.status,
    };
  }

  async getAllMusic(): Promise<GetAllMusicResponse> {
    const musics = await this.musicRepo.find();
    return { musics: musics.map((m) => this.toProto(m)) };
  }

  async themMusic(data: ThemMusicRequest): Promise<Music> {
    // Check name trùng
    const existedName = await this.musicRepo.findOneBy({ name: data.name });
    if (existedName) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: `Nhạc "${data.name}" đã tồn tại`,
      });
    }

    // Check hash trùng (file giống hệt đã upload trước đó)
    const existedHash = await this.musicRepo.findOneBy({ hash: data.hash });
    if (existedHash) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: `File này đã được upload trước đó (tên: "${existedHash.name}")`,
      });
    }

    const saved = await this.musicRepo.save(
      this.musicRepo.create({
        name: data.name,
        fileUrl: data.file_url,
        hash: data.hash,
      }),
    );
    return this.toProto(saved);
  }

  async suaMusic(data: SuaMusicRequest): Promise<Music> {
    const music = await this.musicRepo.findOneBy({ id: data.id });
    if (!music) {
        throw new RpcException({
        code: status.NOT_FOUND,
        message: `Music id=${data.id} không tồn tại`,
        });
    }

    // Validate: đổi file_url thì phải có hash mới đi kèm
    if ((data.file_url !== undefined) !== (data.hash !== undefined)) {
        throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'file_url và hash phải đi cùng nhau khi cập nhật',
        });
    }

    if (data.name !== undefined) music.name = data.name;
    if (data.file_url !== undefined) music.fileUrl = data.file_url;
    if (data.hash !== undefined) music.hash = data.hash;
    if (data.status !== undefined) music.status = data.status as MusicStatus;

    const saved = await this.musicRepo.save(music);
    return this.toProto(saved);
    }

  async xoaMusic(data: XoaMusicRequest): Promise<Empty> {
    const music = await this.musicRepo.findOneBy({ id: data.id });
    if (!music) {
        throw new RpcException({
        code: status.NOT_FOUND,
        message: `Music id=${data.id} không tồn tại`,
        });
    }

    if (music.status === MusicStatus.INACTIVE) {
        return {}; // đã inactive rồi, idempotent
    }

    music.status = MusicStatus.INACTIVE;
    await this.musicRepo.save(music);
    return {};
  }
}