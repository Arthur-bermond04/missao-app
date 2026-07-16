with nova_comunidade as (
  insert into comunidades (nome, tipo, plano)
  values ('Comunidade Teste', 'comunidade', 'semente')
  returning id
)
insert into usuarios (id, comunidade_id, nome, perfil)
select au.id, nc.id, 'Arthur Bermond', 'admin'
from auth.users au, nova_comunidade nc
where au.email = 'arthurbermond04@gmail.com'
returning *;
