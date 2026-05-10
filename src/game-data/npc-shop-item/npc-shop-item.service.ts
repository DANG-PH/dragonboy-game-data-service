import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { NpcShopItemEntity } from './npc-shop-item.entity';
import {
  Empty,
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

  async getShopTheoNpc(data: GetShopTheoNpcRequest): Promise<GetShopTheoNpcResponse> {
    const items = await this.npcShopItemRepo.find({
      where: { npcBase: { id: data.npc_base_id }, is_active: true },
      relations: ['npcBase', 'itemBase'],
      order: { id: 'ASC' },
    });

    return {
      items: items.map((i) => this.toProto(i)),
    };
  }

  async themShopItem(data: ThemShopItemRequest): Promise<NpcShopItem> {
    const saved = await this.npcShopItemRepo.save(
      this.npcShopItemRepo.create({
        npcBase:   { id: data.npc_base_id },
        itemBase:  { id: data.item_base_id }, // ← dùng item_base_id thay tenItem
        gia:       data.gia,
        loaiTien:  data.loaiTien as any,
        tab:       data.tab as any,
        is_active: data.is_active,
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

    item.itemBase  = { id: data.item_base_id } as any; // ← đổi item
    item.gia       = data.gia;
    item.loaiTien  = data.loaiTien as any;
    item.tab       = data.tab as any;
    item.is_active = data.is_active;

    const saved = await this.npcShopItemRepo.save(item);

    // Reload để có full relation sau khi save
    const withRelation = await this.npcShopItemRepo.findOne({
      where: { id: saved.id },
      relations: ['npcBase', 'itemBase'],
    });

    return this.toProto(withRelation);
  }

  async xoaShopItem(data: XoaShopItemRequest): Promise<XoaShopItemResponse> {
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

    await this.npcShopItemRepo.remove(item);
    return {
      npcId: item.npcBase.id
    };
  }

  private toProto(item: NpcShopItemEntity): NpcShopItem {
    return {
      id:           item.id,
      npc_base_id:  item.npcBase.id,
      ten_npc:      item.npcBase.ten,
      item_base_id: item.itemBase.id,   // ← thay tenItem bằng item_base_id
      ten_item:     item.itemBase.ten,  // ← tên lấy từ item_base
      ma_item:      item.itemBase.ma,   // ← mã lấy từ item_base
      gia:          item.gia,
      loaiTien:     item.loaiTien,
      tab:          item.tab,
      is_active:    item.is_active,
    };
  }
}