import "server-only";

export type LegalOperator = {
  name: string;
  inn: string;
  ogrn: string;
  address: string;
  email: string;
  phone: string;
  configured: boolean;
};

export function getLegalOperator(): LegalOperator {
  const value = (name: string) => process.env[name]?.trim() ?? "";
  const operator = {
    name: value("LEGAL_OPERATOR_NAME"),
    inn: value("LEGAL_OPERATOR_INN"),
    ogrn: value("LEGAL_OPERATOR_OGRN"),
    address: value("LEGAL_OPERATOR_ADDRESS"),
    email: value("LEGAL_OPERATOR_EMAIL"),
    phone: value("LEGAL_OPERATOR_PHONE"),
  };
  return {
    ...operator,
    configured: Boolean(operator.name && operator.inn && operator.ogrn && operator.address && operator.email),
  };
}

export function legalOperatorSummary(operator: LegalOperator) {
  if (!operator.configured) return "Реквизиты оператора будут опубликованы до публичного запуска сервиса.";
  return `${operator.name}, ИНН ${operator.inn}, ОГРН/ОГРНИП ${operator.ogrn}, адрес: ${operator.address}, email: ${operator.email}${operator.phone ? `, телефон: ${operator.phone}` : ""}.`;
}
