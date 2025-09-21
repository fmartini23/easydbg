// test/setup.js

/**
 * Arquivo de configuração global para os testes do Jest.
 *
 * Este arquivo é executado automaticamente antes de cada arquivo de teste,
 * garantindo um ambiente limpo e consistente.
 *
 * Funções:
 * 1. Limpa todos os mocks entre os testes para evitar "vazamento" de estado
 *    entre eles. Isso garante que cada teste rode de forma isolada.
 * 2. Pode ser usado para configurar outras globais de teste, como timeouts
 *    ou extensões do Jest.
 */

// A função `afterEach` registrada aqui será executada após cada teste
// em todos os arquivos da suíte de testes.
afterEach(() => {
  // jest.clearAllMocks() reseta as propriedades .mock de todos os mocks.
  // Isso inclui o número de chamadas e os resultados de chamadas anteriores.
  // É a limpeza mais comum e recomendada.
  jest.clearAllMocks();
});

// Exemplo de configuração global de timeout (opcional)
// Se você tiver testes que podem demorar mais que o padrão de 5 segundos do Jest.
// jest.setTimeout(10000); // 10 segundos
