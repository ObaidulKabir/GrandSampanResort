import { Injectable } from '@nestjs/common';
import { ClientsRepository } from './clients.repository';
import { Client } from '../domain/models';

@Injectable()
export class ClientsService {
  private repo = new ClientsRepository();
  list() {
    return this.repo.findAll();
  }
  get(id: string) {
    return this.repo.findById(id);
  }
  create(item: Client) {
    return this.repo.create(item);
  }
  update(id: string, item: Partial<Client>) {
    return this.repo.update(id, item);
  }
  remove(id: string) {
    return this.repo.delete(id);
  }
}

