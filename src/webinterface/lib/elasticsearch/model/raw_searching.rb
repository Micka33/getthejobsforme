require 'elasticsearch/persistence'

module Elasticsearch
  module Model
    module RawSearching
      extend ActiveSupport::Concern

      module LookLikeObject
        def method_missing(meth, *args, &block)
          if has_key?(meth.to_s)
            self[meth.to_s]
          else
            nil
          end
        end
      end

      module ClassMethods

        # Replace Model.find method without deserialize
        #
        def find_many_method(ids, fields=nil)
          type = document_type || (klass ? __get_type_from_class(klass) : nil )

          options = { index: index_name, type: type, body: { ids: ids } }
          options = options.merge(fields: fields) unless fields.nil?
          documents = gateway.client.mget(options)
          documents['docs'].map { |document|
            document['_source']['_id'] = document['_id'] unless document['_source'].nil?
            document['_source'] || document['fields']
          }
        end

        # options[:method] can be
        # => :model (real object which can be saved)
        # => :raw (simplest structure possible without any modification)
        # => :raw_model (perfect mixes)
        #
        def search_method(query_or_payload, options={})
          method = options.delete(:method) || :raw
          case
          when method == :model
            search(query_or_payload, options)
          when method == :raw_model
            raw_search(query_or_payload, options).map { |doc| doc.with_indifferent_access.extend(LookLikeObject) }
          else
            raw_search(query_or_payload, options)
          end
        end

        # Instead of Elasticsearch::Persistence::Repository::Searching
        # We don't build Response::Results because it use Hashie::Mash internaly with slow a lot of things
        #
        def raw_search(query_or_definition, options={})
          type = document_type || (klass ? __get_type_from_class(klass) : nil )

          case
          when query_or_definition.respond_to?(:to_hash)
            response = gateway.client.search( { index: index_name, type: type, body: query_or_definition.to_hash }.merge(options) )
          when query_or_definition.is_a?(String)
            response = gateway.client.search( { index: index_name, type: type, q: query_or_definition }.merge(options) )
          else
            raise ArgumentError, "[!] Pass the search definition as a Hash-like object or pass the query as a String" +
                                 " -- #{query_or_definition.class} given."
          end
          response['hits']['hits'].map { |document|
            document['_source']['_id'] = document['_id'] unless document['_source'].nil?
            document['_source'] || document['fields']
          }
        end

      end

    end
  end
end