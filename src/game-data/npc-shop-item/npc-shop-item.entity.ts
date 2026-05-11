import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { NpcBaseEntity } from '../npc-base/npc-base.entity';
import { ItemBaseEntity } from '../item-base/item-base.entity';

export enum LoaiTien {
  VANG = 'VANG',
  NGOC = 'NGOC',
  // sau này thêm vào đây
}

export enum TabShop {
  AO_QUAN  = 'AO_QUAN',
  PHU_KIEN = 'PHU_KIEN',
  DAC_BIET = 'DAC_BIET',
  // sau này thêm vào đây
}

@Entity('npc_shop_item')
export class NpcShopItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => NpcBaseEntity)
  @JoinColumn({ name: 'npc_base_id' })
  npcBase: NpcBaseEntity;

  @ManyToOne(() => ItemBaseEntity)   
  @JoinColumn({ name: 'item_base_id' })
  itemBase: ItemBaseEntity;

  @Column()
  gia: number;

  @Column({ type: 'enum', enum: LoaiTien })
  loaiTien: LoaiTien;

  @Column({ type: 'enum', enum: TabShop })
  tab: TabShop;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  start_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  end_at: Date | null;
}