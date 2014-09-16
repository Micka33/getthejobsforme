class HomeController < ApplicationController

  def allJobs
    all_jobs = []
    $REDIS_POOL.with do |redis|
      all_jobs = redis.hgetall('jobs')
    end
    log all_jobs
  end

end
