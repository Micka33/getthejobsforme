require 'elasticsearch/persistence'

module Elasticsearch
  module Model
    module EmbeddedDocument

      def self.included(base)
        base.class_eval do
          include Virtus.model
          include ActiveModel::Serialization
          include ActiveModel::Serializers::JSON
          include ActiveModel::Validations
        end
      end

    end
  end
end