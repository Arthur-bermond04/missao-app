-- Limpa tudo que o schema.sql cria, para permitir re-execução limpa

drop table if exists lembretes cascade;
drop table if exists mensagens_enviadas cascade;
drop table if exists financeiro cascade;
drop table if exists celulas cascade;
drop table if exists inscricoes_retiro cascade;
drop table if exists retiros cascade;
drop table if exists contatos cascade;
drop table if exists usuarios cascade;
drop table if exists comunidades cascade;

drop function if exists auth_comunidade_id() cascade;
drop function if exists auth_perfil() cascade;
