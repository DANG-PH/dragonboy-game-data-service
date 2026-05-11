import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { NpcShopItemEntity } from './npc-shop-item.entity';
import {
  GetShopTheoNpcRequest,
  GetShopTheoNpcResponse,
  ThemShopItemRequest,
  SuaShopItemRequest,
  XoaShopItemRequest,
  NpcShopItem,
  XoaShopItemResponse,
} from '../../../proto/game-data.pb';

@Injectable()
export class NpcShopItemService {
  constructor(
    @InjectRepository(NpcShopItemEntity)
    private readonly npcShopItemRepo: Repository<NpcShopItemEntity>,
  ) {}

  // Cách find bằng ORM (2*N trường hợp) N ở đây = 2, vì end_at và start_at có 2*2 = 4 case cần lấy data
  // async getShopTheoNpc(data: GetShopTheoNpcRequest): Promise<GetShopTheoNpcResponse> {
  //   const now = new Date();

  //   // Logic:
  //   // (start_at IS NULL OR start_at <= now) AND (end_at IS NULL OR end_at >= now)
  //   // → expand thành 4 combinations bằng mảng OR
  //   const baseWhere = {
  //     npcBase: { id: data.npc_base_id },
  //     is_active: true,
  //   };

  //   const items = await this.npcShopItemRepo.find({
  //     where: [
  //       { ...baseWhere, start_at: IsNull(),               end_at: IsNull() },
  //       { ...baseWhere, start_at: IsNull(),               end_at: MoreThanOrEqual(now) },
  //       { ...baseWhere, start_at: LessThanOrEqual(now),   end_at: IsNull() },
  //       { ...baseWhere, start_at: LessThanOrEqual(now),   end_at: MoreThanOrEqual(now) },
  //     ],
  //     relations: ['npcBase', 'itemBase'],
  //     order: { id: 'ASC' },
  //   });

  //   return {
  //     items: items.map((i) => this.toProto(i)),
  //   };
  // }

  // Cách filter sau query, logic dễ đọc nhưng trade off là latency cao
  // async getShopTheoNpc(data: GetShopTheoNpcRequest): Promise<GetShopTheoNpcResponse> {
  //   const now = Date.now();

  //   // Query tất cả item active của NPC (đơn giản)
  //   const items = await this.npcShopItemRepo.find({
  //     where: {
  //       npcBase: { id: data.npc_base_id },
  //       is_active: true,
  //     },
  //     relations: ['npcBase', 'itemBase'],
  //     order: { id: 'ASC' },
  //   });

  //   // Filter thời gian ở app layer
  //   const filtered = items.filter((item) => {
  //     const startOk = !item.start_at || item.start_at.getTime() <= now;
  //     const endOk   = !item.end_at   || item.end_at.getTime()   >= now;
  //     return startOk && endOk;
  //   });

  //   return { items: filtered.map((i) => this.toProto(i)) };
  // }

  // Dùng query builder thì đỡ cần khai triển
  // Ví dụ:
  // (A or B) and (C or D) (ở đây query như này)
  // Cách orm bên trên cần triển khai ra vì orm k hỗ trợ 
  // Khai triển thành: (A and C) or (A and D) or (B and C) or (B and D) 
  // Nên cách query builder này gọn và dễ đọc hơn rõ rệt (số điều kiện cần viết cũng ít hơn)
  async getShopTheoNpc(data: GetShopTheoNpcRequest): Promise<GetShopTheoNpcResponse> {
    const now = new Date();

    const items = await this.npcShopItemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.npcBase', 'npcBase')
      .leftJoinAndSelect('item.itemBase', 'itemBase')
      .where('npcBase.id = :npcId', { npcId: data.npc_base_id })
      .andWhere('item.is_active = :active', { active: true })
      .andWhere('(item.start_at IS NULL OR item.start_at <= :now)', { now })
      .andWhere('(item.end_at IS NULL OR item.end_at >= :now)', { now })
      .orderBy('item.id', 'ASC')
      .getMany();

    return { items: items.map((i) => this.toProto(i)) };
  }

  async themShopItem(data: ThemShopItemRequest): Promise<NpcShopItem> {
    const startAt = data.start_at != null ? new Date(Number(data.start_at)) : null;
    const endAt   = data.end_at   != null ? new Date(Number(data.end_at))   : null;

    // Validate cross-field
    this.validateTimeRange(startAt, endAt);

    const saved = await this.npcShopItemRepo.save(
      this.npcShopItemRepo.create({
        npcBase:   { id: data.npc_base_id },
        itemBase:  { id: data.item_base_id },
        gia:       data.gia,
        loaiTien:  data.loaiTien as any,
        tab:       data.tab as any,
        is_active: data.is_active ?? true,
        start_at:  data.start_at != null ? new Date(Number(data.start_at)) : null,
        end_at:    data.end_at   != null ? new Date(Number(data.end_at))   : null,
      }),
    );

    const withRelation = await this.npcShopItemRepo.findOne({
      where: { id: saved.id },
      relations: ['npcBase', 'itemBase'],
    });

    return this.toProto(withRelation);
  }

  async suaShopItem(data: SuaShopItemRequest): Promise<NpcShopItem> {
    const item = await this.npcShopItemRepo.findOne({
      where: { id: data.id },
      relations: ['npcBase', 'itemBase'],
    });

    if (!item) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `ShopItem id=${data.id} không tồn tại`,
      });
    }

    // Partial update: chỉ đổi field nào client thực sự gửi
    if (data.item_base_id !== undefined) item.itemBase  = { id: data.item_base_id } as any;
    if (data.gia          !== undefined) item.gia       = data.gia;
    if (data.loaiTien     !== undefined) item.loaiTien  = data.loaiTien as any;
    if (data.tab          !== undefined) item.tab       = data.tab as any;
    if (data.is_active    !== undefined) item.is_active = data.is_active;
    if (data.start_at     !== undefined) item.start_at  = data.start_at != null ? new Date(Number(data.start_at)) : null;
    if (data.end_at       !== undefined) item.end_at    = data.end_at   != null ? new Date(Number(data.end_at))   : null;

    this.validateTimeRange(item.start_at, item.end_at);

    const saved = await this.npcShopItemRepo.save(item);

    const withRelation = await this.npcShopItemRepo.findOne({
      where: { id: saved.id },
      relations: ['npcBase', 'itemBase'],
    });

    return this.toProto(withRelation);
  }

  async xoaShopItem(data: XoaShopItemRequest): Promise<XoaShopItemResponse> {
    const item = await this.npcShopItemRepo.findOne({
      where: { id: data.id },
      relations: ['npcBase'],
    });

    if (!item) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `ShopItem id=${data.id} không tồn tại`,
      });
    }

    const npcId = item.npcBase.id;
    await this.npcShopItemRepo.remove(item);

    return { npcId };
  }

  private toProto(item: NpcShopItemEntity): NpcShopItem {
    return {
      id:           item.id,
      npc_base_id:  item.npcBase.id,
      ten_npc:      item.npcBase.ten,
      item_base_id: item.itemBase.id,
      ten_item:     item.itemBase.ten,
      ma_item:      item.itemBase.ma,
      gia:          item.gia,
      loaiTien:     item.loaiTien,
      tab:          item.tab,
      is_active:    item.is_active,
      start_at:     item.start_at ? item.start_at.getTime() : undefined,
      end_at:       item.end_at   ? item.end_at.getTime()   : undefined,
    };
  }

  private validateTimeRange(startAt: Date | null, endAt: Date | null): void {
    if (startAt && endAt && endAt <= startAt) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'end_at phải lớn hơn start_at',
      });
    }
  }
}