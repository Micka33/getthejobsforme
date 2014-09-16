redis_config = YAML::load(File.open("#{Rails.root}/config/redis.yml"))[Rails.env]
$REDIS_POOL = ConnectionPool.new(:size => 10, :timeout => 3) { Redis.new(:host => redis_config['host'], :port => redis_config['port']) }