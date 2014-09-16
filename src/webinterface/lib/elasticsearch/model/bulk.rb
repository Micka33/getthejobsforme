require 'elasticsearch/persistence'

module Elasticsearch
  module Model
    module Bulk
      extend ActiveSupport::Concern

      module ClassMethods

        def bulk_index(objects)
          current_time = Time.now.utc

          # Bulk operation for index documents
          #
          response = self.gateway.client.bulk(index: self.index_name, type: self.document_type,
            body: objects.map { |object|

              # Update timestamp before persist
              #
              object['updated_at'] = current_time
              { update: { _id: object['_id'], data: { doc: object, doc_as_upsert: true } } }
            }.as_json,
            refresh: true)
          return false if response['errors'] === true

          # Add created_at property for new objects
          #
          new_object_ids = response['items'].map { |i| i['update']['_id'] if i['update']['status'] == 201 }.compact
          unless new_object_ids.empty?
            response = self.gateway.client.bulk(index: self.index_name, type: self.document_type,
              body: new_object_ids.map { |object_id|
                { update: { _id: object_id, data: { doc: { created_at: current_time } } } }
              }.as_json,
              refresh: true)
            return false if response['errors'] === true
          end

          # Remove token when resource is saved (it's the new orphan)
          #
          if self == Resource
            $REDIS_POOL.with do |redis|
              redis.pipelined do
                objects.each do |object|
                  redis.zrem('presigned_url', object['content'])
                end
              end
            end
          end
          true
        end

        def bulk_delete(objects)
          # Bulk operation for delete documents
          #
          response = self.gateway.client.bulk(index: self.index_name, type: self.document_type,
            body: objects.map { |object|
              { delete: { _id: object['_id'] } }
            }.as_json,
            refresh: true)
          return false if response['errors'] === true

          # Remove uploaded content
          #
          if self == Resource
            objects.each do |object|
              self.delete_uploaded_content(Hashie::Mash.new object)
            end
          end

          true
        end

        def bulk_transaction(redis_key, objects)
          $REDIS_POOL.with do |redis|
            redis.pipelined do
              objects.each do |object|
                redis.hset(redis_key, object['_id'] || object[:id], Oj.dump(object, { :mode => :compat }))
              end
              redis.expire(redis_key, 24.hours.to_i)
            end
          end
        end

      end

    end
  end
end