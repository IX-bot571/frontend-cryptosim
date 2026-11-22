import { Pipe, PipeTransform } from '@angular/core';
import { formatoCompacto, formatoPorcentaje, formatoPrecio } from './formato';

@Pipe({ name: 'precio' })
export class PrecioPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatoPrecio(valor);
  }
}

@Pipe({ name: 'porcentaje' })
export class PorcentajePipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatoPorcentaje(valor);
  }
}

@Pipe({ name: 'compacto' })
export class CompactoPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatoCompacto(valor);
  }
}
