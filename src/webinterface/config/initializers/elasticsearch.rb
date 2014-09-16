ES_CONFIG = YAML::load(File.open("#{Rails.root}/config/elasticsearch.yml"))[Rails.env]
Elasticsearch::Persistence.client = Elasticsearch::Client.new hosts: ES_CONFIG['urls'], retry_on_failure: 3

if Rails.env.development?
  logger           = ActiveSupport::Logger.new(STDERR)
  logger.level     = Logger::INFO
  logger.formatter = proc { |s, d, p, m| "\e[2m#{m}\n\e[0m" }
  Elasticsearch::Persistence.client.transport.logger = logger
  Elasticsearch::Model.client = Elasticsearch::Client.new log: true
else
  Elasticsearch::Model.client = Elasticsearch::Client.new log: false
end