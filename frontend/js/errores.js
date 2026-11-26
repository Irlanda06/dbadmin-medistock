// Error que regresa la capa de API. Siempre trae un mensaje entendible para mostrar en pantalla.
export class ApiError extends Error {
  constructor(mensaje, { codigo = 'ERROR', status = 0, detalle = null } = {}) {
    super(mensaje);
    this.codigo = codigo;
    this.status = status;
    this.detalle = detalle;
  }
}
