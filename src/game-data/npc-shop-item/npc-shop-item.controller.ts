import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { NpcShopItemService } from './npc-shop-item.service';
import type {
  Empty,
  GetShopTheoNpcRequest,
  GetShopTheoNpcResponse,
  ThemShopItemRequest,
  SuaShopItemRequest,
  XoaShopItemRequest,
  NpcShopItem,
  XoaShopItemResponse,
} from '../../../proto/game-data.pb';

@Controller()
export class NpcShopItemController {
  constructor(private readonly npcShopItemService: NpcShopItemService) {}

  @GrpcMethod('GameDataService', 'GetShopTheoNpc')
  async getShopTheoNpc(data: GetShopTheoNpcRequest): Promise<GetShopTheoNpcResponse> {
    return this.npcShopItemService.getShopTheoNpc(data);
  }

  @GrpcMethod('GameDataService', 'ThemShopItem')
  async themShopItem(data: ThemShopItemRequest): Promise<NpcShopItem> {
    return this.npcShopItemService.themShopItem(data);
  }

  @GrpcMethod('GameDataService', 'SuaShopItem')
  async suaShopItem(data: SuaShopItemRequest): Promise<NpcShopItem> {
    return this.npcShopItemService.suaShopItem(data);
  }

  @GrpcMethod('GameDataService', 'XoaShopItem')
  async xoaShopItem(data: XoaShopItemRequest): Promise<XoaShopItemResponse> {
    return this.npcShopItemService.xoaShopItem(data);
  }
}